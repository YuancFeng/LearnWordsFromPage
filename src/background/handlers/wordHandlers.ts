/**
 * LingoRecall AI - Word Handlers
 * Story 3.4 实现 - 复习结果反馈
 *
 * 处理词汇相关的消息请求
 *
 * @module background/handlers/wordHandlers
 */

import type { Response, ReviewWordPayload, ReviewWordResult, WordRecord } from '../../shared/messaging/types';
import { getWordById, updateWord } from '../../shared/storage';
import { calculateNextReview } from '../../shared/utils/ebbinghaus';
import { checkAndUpdateBadge } from '../badge';
import { ErrorCode } from '../../shared/types/errors';

/**
 * 处理复习词汇请求
 * Story 3.4 - AC1, AC2, AC3: 根据复习结果更新词汇复习参数
 *
 * @param payload 复习请求数据
 * @returns Promise<Response<ReviewWordResult>> 更新后的词汇记录
 */
export async function handleReviewWord(
  payload: ReviewWordPayload
): Promise<Response<ReviewWordResult>> {
  const { wordId, result } = payload;

  console.log(`[LingoRecall] REVIEW_WORD: ${wordId}, result: ${result}`);

  try {
    // 1. 获取当前词汇
    const wordResult = await getWordById(wordId);

    if (!wordResult.success || !wordResult.data) {
      return {
        success: false,
        error: {
          code: ErrorCode.NOT_FOUND,
          message: '词汇不存在',
        },
      };
    }

    const word = wordResult.data;

    // 2. 计算新的复习参数
    const updates = calculateNextReview(word.reviewCount, result);

    console.log(`[LingoRecall] Review update: reviewCount ${word.reviewCount} -> ${updates.reviewCount}, interval ${word.interval} -> ${updates.interval}`);

    // 3. 更新数据库
    const updateResult = await updateWord(wordId, {
      nextReviewAt: updates.nextReviewAt,
      reviewCount: updates.reviewCount,
      interval: updates.interval,
    });

    if (!updateResult.success) {
      return {
        success: false,
        error: updateResult.error,
      };
    }

    // 4. 异步更新 Badge（不阻塞响应）
    // AC1, AC2: Badge 数字减 1
    checkAndUpdateBadge().catch((error) => {
      console.error('[LingoRecall] Failed to update badge after review:', error);
    });

    // 5. 返回更新后的词汇记录
    const updatedWord: WordRecord = {
      ...word,
      nextReviewAt: updates.nextReviewAt,
      reviewCount: updates.reviewCount,
      interval: updates.interval,
    };

    return {
      success: true,
      data: { word: updatedWord },
    };
  } catch (error) {
    console.error('[LingoRecall] handleReviewWord error:', error);
    return {
      success: false,
      error: {
        code: ErrorCode.STORAGE_ERROR,
        message: error instanceof Error ? error.message : '复习更新失败',
      },
    };
  }
}
