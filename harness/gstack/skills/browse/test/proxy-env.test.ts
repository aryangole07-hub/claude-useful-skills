/**
 * #915: proxy precedence, NO_PROXY translation, the config hash and the
 * mismatch refusal. The daemon round trip is in proxy-env-daemon.test.ts.
 */
import { describe, expect, test } from 'bun:test';
import { computeConfigHash, noProxyToChromiumRules, parseProxyConfig, resolveProxy, serverProxyEnv, withLoopbackBypass } from '../src/proxy-config';
import { buildHeadedServerEnv, buildRestartEnv, extractGlobalFlags, proxyMismatchLines, withLoopbackNoProxy } from '../src/cli';

describe('resolveProxy precedence', () => {
  const env = {
    BROWSE_PROXY_URL: 'http://browse.example:1',
    HTTPS_PROXY: 'http://https-upper.example:2',
    https_proxy: 'http://https-lower.example:3',
    HTTP_PROXY: 'http://http-upper.example:4',
    http_proxy: 'http://http-lower.example:5',
    ALL_PROXY: 'socks5://all-upper.example:6',
    all_proxy: 'socks5://all-lower.example:7',
  };
  const order: Array<[string, string]> = [
    ['BROWSE_PROXY_URL', 'http://browse.example:1/'],
    ['HTTPS_PROXY', 'http://https-upper.example:2/'],
    ['https_proxy', 'http://https-lower.example:3/'],
    ['HTTP_PROXY', 'http://http-upper.example:4/'],
    ['http_proxy', 'http://http-lower.example:5/'],
    ['ALL_PROXY', 'socks5://all-upper.example:6'],
    ['all_proxy', 'socks5://all-lower.example:7'],
  ];

  test('--proxy wins over every variable', () => {
    expect(resolveProxy('http://flag.example:9', env)).toMatchObject({ url: 'http://flag.example:9/', source: '--proxy' });
  });

  test('then BROWSE_PROXY_URL, HTTPS_PROXY, HTTP_PROXY and ALL_PROXY, upper case before lower case', () => {
    const remaining: Record<string, string> = { ...env };
    for (const [source, url] of order) {
      expect(resolveProxy(null, remaining)).toMatchObject({ url, source, warning: null });
      delete remaining[source];
    }
    expect(resolveProxy(null, remaining)).toEqual({ url: null, source: null, noProxyRules: null, bypass: null, warning: null });
  });

  test('BROWSE_PROXY_URL=direct opts out of the standard variables, but not out of --proxy', () => {
    expect(resolveProxy(null, { ...env, BROWSE_PROXY_URL: 'direct' })).toMatchObject({ url: null, source: null, warning: null });
    expect(resolveProxy('http://flag.example:9', { ...env, BROWSE_PROXY_URL: 'direct' }).source).toBe('--proxy');
  });

  test('empty variables count as unset', () => {
    expect(resolveProxy(null, { HTTPS_PROXY: '', HTTP_PROXY: 'http://h:8' }).source).toBe('HTTP_PROXY');
  });

  test('socks5h maps to socks5, which already resolves names through the proxy', () => {
    expect(resolveProxy(null, { ALL_PROXY: 'socks5h://u:p@sock.example:1080' }).url).toBe('socks5://u:p@sock.example:1080');
    expect(parseProxyConfig({ proxyUrl: 'socks5h://sock.example' })).toMatchObject({ scheme: 'socks5', port: 1080 });
  });

  test('env URLs keep the cred policy, and the hint names the variable', () => {
    expect(resolveProxy(null, { HTTPS_PROXY: 'http://proxy.example:3128', BROWSE_PROXY_USER: 'USER', BROWSE_PROXY_PASS: 'PASSWORD' }).url).toBe('http://USER:PASSWORD@proxy.example:3128/');
    try {
      resolveProxy(null, { HTTPS_PROXY: 'http://USER:PASSWORD@proxy.example:3128', BROWSE_PROXY_USER: 'u' });
      throw new Error('expected the cred policy to refuse');
    } catch (err: any) {
      expect(err.message).toMatch(/pick one source/);
      expect(err.hint).toBe('unset BROWSE_PROXY_USER/PASS or remove user:pass@ from HTTPS_PROXY');
    }
  });

  test('a standard variable that does not parse warns and falls back to direct, without echoing it', () => {
    for (const value of ['proxy.corp:8080', 'user:secret@proxy.corp:8080', 'ftp://proxy.corp:21', 'http://proxy.corp:99999']) {
      const resolved = resolveProxy(null, { https_proxy: value });
      expect(resolved).toMatchObject({ url: null, source: null, bypass: null });
      expect(resolved.warning).toStartWith('https_proxy is not a proxy URL browse can use (');
      expect(resolved.warning).toContain('fix: export https_proxy=http://host:port (or socks5://), or set BROWSE_PROXY_URL=direct');
      expect(resolved.warning).toContain('BROWSER.md#proxy-from-environment');
      expect(resolved.warning).not.toContain('secret');
    }
  });

  test('--proxy and BROWSE_PROXY_URL are explicit and still fail closed', () => {
    expect(() => resolveProxy('proxy.corp:8080', {})).toThrow(/unsupported proxy scheme/);
    expect(() => resolveProxy(null, { BROWSE_PROXY_URL: 'proxy.corp:8080' })).toThrow(/unsupported proxy scheme/);
  });
});

describe('NO_PROXY → Chromium bypass rules', () => {
  test('curl-style entries become Chromium rules; loopback is always bypassed', () => {
    expect(noProxyToChromiumRules('example.com, .corp.internal,*.wild.test  10.0.0.0/8,host.test:8080,::1,fe80::1,[2001:db8::2]:443,192.168.1.5,localhost,127.0.0.1,bad:port:x:')).toEqual([
      '*.corp.internal', '*.example.com', '*.host.test:8080', '*.wild.test', '10.0.0.0/8', '192.168.1.5',
      '[2001:db8::2]:443', '[fe80::1]', 'corp.internal', 'example.com', 'host.test:8080',
    ].sort());
    expect(noProxyToChromiumRules('*')).toEqual(['*']);
    expect(noProxyToChromiumRules(undefined)).toEqual([]);
    expect(withLoopbackBypass([])).toBe('localhost,127.0.0.1,[::1]');
  });

  test("the CLI's own loopback NO_PROXY additions never change the rules (#494)", () => {
    expect(noProxyToChromiumRules(withLoopbackNoProxy({ NO_PROXY: 'corp.internal' }))).toEqual(noProxyToChromiumRules('corp.internal'));
    expect(resolveProxy(null, { HTTP_PROXY: 'http://p:1', NO_PROXY: withLoopbackNoProxy({}) }).noProxyRules).toBeNull();
  });
});

describe('config hash', () => {
  const base = { HTTP_PROXY: 'http://proxy.example:3128' };

  test('a NO_PROXY-only change changes the hash of a proxied session', () => {
    const a = extractGlobalFlags(['text'], base);
    const b = extractGlobalFlags(['text'], { ...base, NO_PROXY: 'corp.internal' });
    expect(a.proxyUrl).toBe(b.proxyUrl!);
    expect(a.configHash).not.toBe(b.configHash);
  });

  test('without NO_PROXY entries the hash is the pre-#915 hash, so running daemons stay reusable', () => {
    expect(extractGlobalFlags(['--proxy', 'socks5://reuse.example:1080', 'text'], {}).configHash)
      .toBe(computeConfigHash({ proxyUrl: 'socks5://reuse.example:1080', headed: false }));
    expect(extractGlobalFlags(['text'], { NO_PROXY: 'corp.internal' }).configHash).toBe(computeConfigHash({ proxyUrl: null, headed: false }));
  });

  test('the env-resolved proxy is part of the hash', () => {
    expect(extractGlobalFlags(['text'], base).configHash).not.toBe(extractGlobalFlags(['text'], {}).configHash);
    expect(extractGlobalFlags(['text'], base).configHash).toBe(extractGlobalFlags(['--proxy', 'http://proxy.example:3128', 'text'], {}).configHash);
  });
});

describe('server env carries the proxy source and bypass', () => {
  const flags = extractGlobalFlags(['text'], { HTTPS_PROXY: 'http://proxy.example:3128', NO_PROXY: 'corp.internal' });
  const expected = {
    BROWSE_PROXY_URL: 'http://proxy.example:3128/',
    BROWSE_PROXY_SOURCE: 'HTTPS_PROXY',
    BROWSE_PROXY_BYPASS: '*.corp.internal,corp.internal,localhost,127.0.0.1,[::1]',
  };

  test('restart and headed launches reapply all three', () => {
    expect(buildRestartEnv(flags, null)).toMatchObject(expected);
    expect(buildHeadedServerEnv(flags)).toMatchObject(expected);
    expect(buildRestartEnv(extractGlobalFlags(['text'], {}), null).BROWSE_PROXY_URL).toBeUndefined();
  });
});

describe('serverProxyEnv (the daemon side)', () => {
  test('direct means no proxy, and a launch without the CLI still keeps loopback and NO_PROXY', () => {
    expect(serverProxyEnv({ BROWSE_PROXY_URL: 'direct' }).url).toBeUndefined();
    expect(serverProxyEnv({ BROWSE_PROXY_URL: 'http://p:1', NO_PROXY: 'corp.internal' })).toEqual({
      url: 'http://p:1', source: 'BROWSE_PROXY_URL', bypass: '*.corp.internal,corp.internal,localhost,127.0.0.1,[::1]',
    });
    expect(serverProxyEnv({ BROWSE_PROXY_URL: 'http://p:1', BROWSE_PROXY_SOURCE: 'ALL_PROXY', BROWSE_PROXY_BYPASS: 'x,localhost' })).toMatchObject({ source: 'ALL_PROXY', bypass: 'x,localhost' });
  });
});

describe('proxyMismatchLines', () => {
  const state = (extra: Record<string, unknown> = {}) => ({ pid: 1, port: 1, token: 't', startedAt: '', serverPath: '', mode: 'launched' as const, configHash: 'x', ...extra });
  const proxied = { proxy: 'http://proxy.example:3128/', proxySource: 'HTTPS_PROXY', proxyBypass: 'localhost,127.0.0.1,[::1]' };

  test('an env proxy meeting a direct daemon names the variable and offers stop or direct', () => {
    const lines = proxyMismatchLines(extractGlobalFlags(['text'], { HTTPS_PROXY: 'http://proxy.example:3128' }), state(), {})!;
    expect(lines[0]).toContain('(HTTPS_PROXY differs)');
    expect(lines[1]).toBe('  daemon:  no proxy');
    expect(lines[2]).toBe('  session: proxy http://proxy.example:3128/ from HTTPS_PROXY, bypassing localhost,127.0.0.1,[::1]');
    expect(lines[3]).toBe("fix: run 'browse stop' to restart the daemon with this session's proxy settings, or set BROWSE_PROXY_URL=direct to use the running daemon without a proxy.");
    expect(lines[4]).toBe('see https://github.com/garrytan/gstack/blob/main/BROWSER.md#proxy-from-environment');
  });

  test('a direct session meeting an env-proxied daemon names the daemon variable', () => {
    const lines = proxyMismatchLines(extractGlobalFlags(['text'], {}), state(proxied), {})!;
    expect(lines[0]).toContain('(HTTPS_PROXY differs)');
    expect(lines[2]).toBe('  session: no proxy');
    expect(lines[3]).toContain("or run this session with the daemon's HTTPS_PROXY");
  });

  test('a credentialed proxy is redacted on both sides', () => {
    const lines = proxyMismatchLines(extractGlobalFlags(['text'], { HTTPS_PROXY: 'http://USER:PASSWORD@proxy.example:3128' }), state(), {})!;
    expect(lines.join('\n')).not.toContain('PASSWORD');
    expect(lines[2]).toContain('http://***:***@proxy.example:3128/');
  });

  test('--proxy and headed differences keep the existing refusals', () => {
    expect(proxyMismatchLines(extractGlobalFlags(['--proxy', 'http://p:1', 'text'], {}), state(), {})).toBeNull();
    expect(proxyMismatchLines(extractGlobalFlags(['text'], { HTTPS_PROXY: 'http://p:1' }), state({ mode: 'headed' }), {})).toBeNull();
  });
});

describe('BROWSER.md documents the proxy messages', () => {
  test('the anchor every #915 message cites exists and covers the precedence and both messages', async () => {
    const doc = await Bun.file(new URL('../../BROWSER.md', import.meta.url)).text();
    const section = doc.slice(doc.indexOf('\n### Proxy from environment\n'));
    expect(section.length).toBeLessThan(doc.length);
    for (const needle of ['BROWSE_PROXY_URL=direct', 'HTTPS_PROXY', 'ALL_PROXY', 'NO_PROXY', 'is not a proxy URL browse can use', 'different proxy settings', 'browse stop']) {
      expect(section).toContain(needle);
    }
  });
});
