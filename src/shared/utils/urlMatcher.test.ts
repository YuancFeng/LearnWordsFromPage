/**
 * LingoRecall AI - URL Matcher Tests
 * Story 4.3 - Task 2: URL 匹配工具测试
 *
 * TDD: 测试先行，确保 URL 匹配逻辑正确
 *
 * @module shared/utils/urlMatcher.test
 */

import { describe, it, expect } from 'vitest';
import {
  patternToRegex,
  matchesBlacklist,
  isValidPattern,
  normalizePattern,
} from './urlMatcher';

// ============================================================
// patternToRegex Tests
// ============================================================

describe('patternToRegex', () => {
  it('converts simple pattern to regex', () => {
    const regex = patternToRegex('example.com');
    expect(regex.test('example.com')).toBe(true);
    expect(regex.test('example.org')).toBe(false);
  });

  it('converts wildcard * to match any characters', () => {
    const regex = patternToRegex('*bank*');
    expect(regex.test('mybank.com')).toBe(true);
    expect(regex.test('bankofamerica.com')).toBe(true);
    expect(regex.test('online-banking.net')).toBe(true);
    expect(regex.test('prankster.com')).toBe(false);
  });

  it('converts subdomain wildcard *.domain.com', () => {
    const regex = patternToRegex('*.paypal.com');
    expect(regex.test('www.paypal.com')).toBe(true);
    expect(regex.test('checkout.paypal.com')).toBe(true);
    expect(regex.test('api.checkout.paypal.com')).toBe(true);
    // Should not match fake domains
    expect(regex.test('paypal.com.fake.com')).toBe(false);
  });

  it('escapes regex special characters', () => {
    const regex = patternToRegex('example.com/path?query=1');
    expect(regex.test('example.com/path?query=1')).toBe(true);
    // . should be literal dot, not "any character"
    expect(regex.test('exampleXcom/path?query=1')).toBe(false);
  });

  it('is case insensitive', () => {
    const regex = patternToRegex('*.PayPal.COM');
    expect(regex.test('www.paypal.com')).toBe(true);
    expect(regex.test('WWW.PAYPAL.COM')).toBe(true);
    expect(regex.test('Www.PayPal.Com')).toBe(true);
  });
});

// ============================================================
// matchesBlacklist Tests
// ============================================================

describe('matchesBlacklist', () => {
  const defaultBlacklist = ['*.paypal.com', '*.alipay.com', '*bank*'];

  describe('hostname matching', () => {
    it('matches subdomain wildcard patterns', () => {
      expect(matchesBlacklist('https://www.paypal.com/checkout', defaultBlacklist)).toBe(true);
      expect(matchesBlacklist('https://checkout.paypal.com', defaultBlacklist)).toBe(true);
      expect(matchesBlacklist('https://global.alipay.com', defaultBlacklist)).toBe(true);
    });

    it('matches keyword wildcard patterns', () => {
      expect(matchesBlacklist('https://www.mybank.com', defaultBlacklist)).toBe(true);
      expect(matchesBlacklist('https://bankofamerica.com/login', defaultBlacklist)).toBe(true);
      expect(matchesBlacklist('https://online-banking.net', defaultBlacklist)).toBe(true);
    });

    it('does not match unrelated sites', () => {
      expect(matchesBlacklist('https://www.google.com', defaultBlacklist)).toBe(false);
      expect(matchesBlacklist('https://github.com/project', defaultBlacklist)).toBe(false);
      expect(matchesBlacklist('https://developer.mozilla.org', defaultBlacklist)).toBe(false);
    });

    it('does not match fake domains trying to impersonate', () => {
      // paypal.com.fake.com should NOT match *.paypal.com
      expect(matchesBlacklist('https://paypal.com.fake.com', defaultBlacklist)).toBe(false);
      // alipay.fake.com should NOT match *.alipay.com
      expect(matchesBlacklist('https://alipay.fake.com', defaultBlacklist)).toBe(false);
    });

    it('does not match partial keyword without boundaries', () => {
      // "prankster" contains "bank" but should not match *bank* in hostname context
      expect(matchesBlacklist('https://prankster.com', defaultBlacklist)).toBe(false);
      expect(matchesBlacklist('https://www.frankly.com', defaultBlacklist)).toBe(false);
    });
  });

  describe('exact domain matching', () => {
    const exactPatterns = ['pay.google.com', 'stripe.com'];

    it('matches exact domain patterns', () => {
      expect(matchesBlacklist('https://pay.google.com/checkout', exactPatterns)).toBe(true);
      expect(matchesBlacklist('https://stripe.com/dashboard', exactPatterns)).toBe(true);
    });

    it('does not match subdomains for exact patterns', () => {
      expect(matchesBlacklist('https://www.stripe.com', exactPatterns)).toBe(false);
      expect(matchesBlacklist('https://api.stripe.com', exactPatterns)).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('handles invalid URLs gracefully', () => {
      expect(matchesBlacklist('not-a-valid-url', defaultBlacklist)).toBe(false);
      expect(matchesBlacklist('', defaultBlacklist)).toBe(false);
    });

    it('handles empty blacklist', () => {
      expect(matchesBlacklist('https://paypal.com', [])).toBe(false);
    });

    it('handles file:// and chrome:// URLs', () => {
      expect(matchesBlacklist('file:///path/to/file.html', defaultBlacklist)).toBe(false);
      expect(matchesBlacklist('chrome://settings', defaultBlacklist)).toBe(false);
    });

    it('is case insensitive', () => {
      expect(matchesBlacklist('https://WWW.PAYPAL.COM', defaultBlacklist)).toBe(true);
      expect(matchesBlacklist('https://www.PayPal.Com', defaultBlacklist)).toBe(true);
    });
  });
});

// ============================================================
// isValidPattern Tests
// ============================================================

describe('isValidPattern', () => {
  it('accepts valid subdomain patterns', () => {
    expect(isValidPattern('*.paypal.com')).toBe(true);
    expect(isValidPattern('*.alipay.com')).toBe(true);
    expect(isValidPattern('*.example.com')).toBe(true);
  });

  it('accepts valid keyword patterns', () => {
    expect(isValidPattern('*bank*')).toBe(true);
    expect(isValidPattern('*payment*')).toBe(true);
    expect(isValidPattern('*finance*')).toBe(true);
  });

  it('accepts exact domain patterns', () => {
    expect(isValidPattern('pay.google.com')).toBe(true);
    expect(isValidPattern('stripe.com')).toBe(true);
    expect(isValidPattern('example.com')).toBe(true);
  });

  it('rejects empty or whitespace-only patterns', () => {
    expect(isValidPattern('')).toBe(false);
    expect(isValidPattern('   ')).toBe(false);
    expect(isValidPattern('\t\n')).toBe(false);
  });

  it('rejects patterns that are only wildcards', () => {
    expect(isValidPattern('*')).toBe(false);
    expect(isValidPattern('**')).toBe(false);
    expect(isValidPattern('***')).toBe(false);
  });

  it('rejects patterns with too few non-wildcard characters', () => {
    expect(isValidPattern('*a')).toBe(false);
    expect(isValidPattern('a*')).toBe(false);
    expect(isValidPattern('*.')).toBe(false);
  });

  it('accepts patterns with at least 2 non-wildcard characters', () => {
    expect(isValidPattern('*ab*')).toBe(true);
    expect(isValidPattern('ab')).toBe(true);
    expect(isValidPattern('*.co')).toBe(true);
  });
});

// ============================================================
// normalizePattern Tests
// ============================================================

describe('normalizePattern', () => {
  it('converts to lowercase', () => {
    expect(normalizePattern('*.PayPal.COM')).toBe('*.paypal.com');
    expect(normalizePattern('*BANK*')).toBe('*bank*');
  });

  it('trims whitespace', () => {
    expect(normalizePattern('  *.paypal.com  ')).toBe('*.paypal.com');
    expect(normalizePattern('\t*bank*\n')).toBe('*bank*');
  });

  it('removes duplicate wildcards', () => {
    expect(normalizePattern('**bank**')).toBe('*bank*');
    expect(normalizePattern('***.paypal.com')).toBe('*.paypal.com');
  });
});
