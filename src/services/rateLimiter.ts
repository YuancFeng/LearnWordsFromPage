/**
 * LingoRecall AI - Rate Limiter & Circuit Breaker
 * 全局速率限制器 + 熔断器，防止 Gemini API 429 级联失败
 *
 * Circuit Breaker 状态机：
 *   closed → (连续 3 次 429) → open → (冷却 60s) → half-open → (试探成功) → closed
 *                                                                (试探失败) → open
 *
 * Request Spacing：
 *   默认 1000ms → 首次 429 后 5000ms → 连续 429 后 10000ms → 成功后逐步缩短 (× 0.7)
 *
 * @module services/rateLimiter
 */

// ============================================================
// Types
// ============================================================

/** 熔断器状态 */
type CircuitState = 'closed' | 'open' | 'half-open';

/** 速率限制检查结果 */
export interface RateLimitCheck {
  /** 是否允许请求 */
  allowed: boolean;
  /** 需要等待的毫秒数（allowed=true 时可能 > 0，表示需先等待再请求） */
  waitMs: number;
  /** 不允许时的原因 */
  reason?: 'CIRCUIT_OPEN';
}

// ============================================================
// Constants
// ============================================================

/** 触发熔断的连续 429 次数阈值 */
const CIRCUIT_OPEN_THRESHOLD = 3;

/** 熔断冷却时间（毫秒）— 60s */
const CIRCUIT_COOLDOWN_MS = 60_000;

/** 默认请求最小间隔（毫秒）— ~12 RPM，留余量 */
const DEFAULT_SPACING_MS = 1000;

/** 首次 429 后的间隔 */
const FIRST_429_SPACING_MS = 5000;

/** 连续 429 后的间隔 */
const CONSECUTIVE_429_SPACING_MS = 10_000;

/** 成功请求后间隔缩短系数 */
const SPACING_DECAY_FACTOR = 0.7;

// ============================================================
// State
// ============================================================

/** 熔断器当前状态 */
let circuitState: CircuitState = 'closed';

/** half-open 状态下是否已有试探请求在飞行中 */
let halfOpenProbeInFlight = false;

/** 连续 429 错误计数 */
let consecutive429Count = 0;

/** 熔断器打开的时间戳 */
let circuitOpenedAt = 0;

/** 上一次请求发出的时间戳 */
let lastRequestAt = 0;

/** 当前请求间隔（毫秒） */
let currentSpacingMs = DEFAULT_SPACING_MS;

// ============================================================
// 429 Error Detection
// ============================================================

/**
 * 判断错误是否为 429 类型（速率限制）
 * 支持 Error 实例、对象和字符串格式
 */
export function is429Error(error: unknown): boolean {
  if (error instanceof Error) {
    const msg = error.message.toUpperCase();
    return (
      msg.includes('429') ||
      msg.includes('RATE_LIMIT') ||
      msg.includes('RESOURCE_EXHAUSTED') ||
      msg.includes('QUOTA_EXCEEDED')
    );
  }

  if (typeof error === 'object' && error !== null) {
    const errObj = error as Record<string, unknown>;
    if (errObj.status === 429) return true;
    if (errObj.code === 'RESOURCE_EXHAUSTED' || errObj.code === 'RATE_LIMIT_EXCEEDED') return true;
    const message = typeof errObj.message === 'string' ? errObj.message.toUpperCase() : '';
    return message.includes('429') || message.includes('RATE_LIMIT') || message.includes('RESOURCE_EXHAUSTED');
  }

  if (typeof error === 'string') {
    const normalized = error.toUpperCase();
    return normalized.includes('429') || normalized.includes('RATE_LIMIT');
  }

  return false;
}

// ============================================================
// Circuit Breaker Logic
// ============================================================

/**
 * 检查熔断器是否允许请求通过
 * half-open 状态下只允许 1 个试探请求
 */
function checkCircuitBreaker(): { allowed: boolean; reason?: 'CIRCUIT_OPEN' } {
  if (circuitState === 'closed') {
    return { allowed: true };
  }

  if (circuitState === 'open') {
    const elapsed = Date.now() - circuitOpenedAt;
    if (elapsed >= CIRCUIT_COOLDOWN_MS) {
      // 冷却时间已过，进入 half-open 状态
      circuitState = 'half-open';
      console.log('[LingoRecall RateLimiter] Circuit breaker → half-open (cooldown elapsed)');
      return { allowed: true };
    }
    // 仍在冷却中
    return { allowed: false, reason: 'CIRCUIT_OPEN' };
  }

  // half-open：只允许 1 个试探请求
  if (halfOpenProbeInFlight) {
    // 已有试探请求在飞行中，拒绝并发请求
    return { allowed: false, reason: 'CIRCUIT_OPEN' };
  }
  return { allowed: true };
}

/**
 * 打开熔断器
 */
function openCircuit(): void {
  circuitState = 'open';
  circuitOpenedAt = Date.now();
  console.warn(
    `[LingoRecall RateLimiter] Circuit breaker → OPEN (${consecutive429Count} consecutive 429 errors). ` +
    `Will retry after ${CIRCUIT_COOLDOWN_MS / 1000}s cooldown.`
  );
}

// ============================================================
// Public API
// ============================================================

/**
 * 检查是否允许发送请求
 * 综合熔断器状态和请求间隔控制
 *
 * @returns RateLimitCheck — allowed / waitMs / reason
 */
export function checkRateLimit(): RateLimitCheck {
  // 1. 熔断器检查
  const circuitCheck = checkCircuitBreaker();
  if (!circuitCheck.allowed) {
    return {
      allowed: false,
      waitMs: 0,
      reason: 'CIRCUIT_OPEN',
    };
  }

  // 2. 请求间隔检查
  const now = Date.now();
  const elapsed = now - lastRequestAt;
  const waitMs = Math.max(0, currentSpacingMs - elapsed);

  return {
    allowed: true,
    waitMs,
  };
}

/**
 * 标记请求开始
 * 更新最后请求时间戳
 */
export function onRequestStart(): void {
  lastRequestAt = Date.now();
  // half-open 状态下标记试探请求已发出
  if (circuitState === 'half-open') {
    halfOpenProbeInFlight = true;
  }
}

/**
 * 标记请求成功
 * 重置熔断器（如果处于 half-open 状态），逐步缩短间隔
 */
export function onRequestSuccess(): void {
  // half-open 试探成功 → 回到 closed
  if (circuitState === 'half-open') {
    circuitState = 'closed';
    halfOpenProbeInFlight = false;
    console.log('[LingoRecall RateLimiter] Circuit breaker → closed (probe request succeeded)');
  }

  // 重置连续 429 计数
  consecutive429Count = 0;

  // 逐步缩短间隔，但不低于默认值
  if (currentSpacingMs > DEFAULT_SPACING_MS) {
    currentSpacingMs = Math.max(
      DEFAULT_SPACING_MS,
      Math.round(currentSpacingMs * SPACING_DECAY_FACTOR)
    );
    console.log(`[LingoRecall RateLimiter] Spacing decreased to ${currentSpacingMs}ms`);
  }
}

/**
 * 标记 429 速率限制错误
 * 增加连续 429 计数，调整间隔，必要时触发熔断
 */
export function onRateLimitError(): void {
  consecutive429Count++;

  // half-open 试探失败 → 回到 open
  if (circuitState === 'half-open') {
    halfOpenProbeInFlight = false;
    openCircuit();
    return;
  }

  // 调整请求间隔
  if (consecutive429Count === 1) {
    currentSpacingMs = FIRST_429_SPACING_MS;
    console.warn(`[LingoRecall RateLimiter] First 429 error, spacing increased to ${currentSpacingMs}ms`);
  } else {
    currentSpacingMs = CONSECUTIVE_429_SPACING_MS;
    console.warn(`[LingoRecall RateLimiter] Consecutive 429 error (#${consecutive429Count}), spacing increased to ${currentSpacingMs}ms`);
  }

  // 连续 429 次数达到阈值 → 打开熔断器
  if (consecutive429Count >= CIRCUIT_OPEN_THRESHOLD) {
    openCircuit();
  }
}

/**
 * 标记非 429 的其他错误
 * 不影响熔断器状态，但不重置连续 429 计数
 */
export function onRequestError(): void {
  // half-open 状态下，非 429 错误也视为试探失败 → 回到 open
  if (circuitState === 'half-open') {
    halfOpenProbeInFlight = false;
    openCircuit();
    console.warn('[LingoRecall RateLimiter] Half-open probe failed (non-429 error), circuit → OPEN');
    return;
  }
  // closed 状态下的其他错误不改变熔断器状态
  // 也不重置 consecutive429Count，因为可能只是中间穿插了一个其他错误
}

/**
 * 重置速率限制器到初始状态
 * 用于设置变更或手动恢复
 */
export function resetRateLimiter(): void {
  circuitState = 'closed';
  halfOpenProbeInFlight = false;
  consecutive429Count = 0;
  circuitOpenedAt = 0;
  lastRequestAt = 0;
  currentSpacingMs = DEFAULT_SPACING_MS;
  console.log('[LingoRecall RateLimiter] Reset to initial state');
}
