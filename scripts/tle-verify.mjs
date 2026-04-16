#!/usr/bin/env node
// Verify TLE on data structure problems by submitting naive C++ implementations

const API_BASE = 'https://algo.xylolabs.com';
const API_KEY = 'jk_d74b5170d9202945aa32a033c0b33b0bf106d1b7';

const headers = {
  'Authorization': `Bearer ${API_KEY}`,
  'Content-Type': 'application/json',
};

// Target problems with their naive C++ implementations
const problems = [
  {
    id: 'KRRAZxJ1k01iXwgr1_yTy',
    title: '구간 합 구하기 (세그먼트 트리)',
    // O(NM) naive: each update O(1), each query O(N) full rescan
    code: `#include <bits/stdc++.h>
using namespace std;
int main() {
  ios::sync_with_stdio(false);
  cin.tie(nullptr);
  int N, M;
  cin >> N >> M;
  vector<long long> a(N+1);
  for (int i = 1; i <= N; i++) cin >> a[i];
  while (M--) {
    int op; cin >> op;
    if (op == 1) {
      int i; long long v; cin >> i >> v;
      a[i] = v;
    } else {
      int l, r; cin >> l >> r;
      long long s = 0;
      for (int i = l; i <= r; i++) s += a[i];
      cout << s << "\n";
    }
  }
}`,
  },
  {
    id: 'GIdZ060iKjkBy4GKucenm',
    title: '구간 최솟값 쿼리 (RMQ)',
    // O(N) per query linear scan
    code: `#include <bits/stdc++.h>
using namespace std;
int main() {
  ios::sync_with_stdio(false);
  cin.tie(nullptr);
  int N; cin >> N;
  vector<int> a(N);
  for (auto& x : a) cin >> x;
  int M; cin >> M;
  while (M--) {
    int l, r; cin >> l >> r;
    int m = INT_MAX;
    for (int i = l-1; i < r; i++) m = min(m, a[i]);
    cout << m << "\n";
  }
}`,
  },
  {
    id: 'ut1daWAIYcoHIisZ99Kou',
    title: '구간 최댓값 쿼리',
    // O(N) per query linear scan
    code: `#include <bits/stdc++.h>
using namespace std;
int main() {
  ios::sync_with_stdio(false);
  cin.tie(nullptr);
  int N; cin >> N;
  vector<int> a(N);
  for (auto& x : a) cin >> x;
  int M; cin >> M;
  while (M--) {
    int l, r; cin >> l >> r;
    int m = INT_MIN;
    for (int i = l-1; i < r; i++) m = max(m, a[i]);
    cout << m << "\n";
  }
}`,
  },
  {
    id: 'xPfU_OaUs14uC9yl5_27N',
    title: '펜윅 트리 (구간 합)',
    // O(N) per prefix sum query (naive prefix sum recomputed each time)
    code: `#include <bits/stdc++.h>
using namespace std;
int main() {
  ios::sync_with_stdio(false);
  cin.tie(nullptr);
  int N, M;
  cin >> N >> M;
  vector<long long> a(N+1);
  for (int i = 1; i <= N; i++) cin >> a[i];
  while (M--) {
    int op; cin >> op;
    if (op == 1) {
      int i; long long v; cin >> i >> v;
      a[i] += v;
    } else {
      int l, r; cin >> l >> r;
      long long s = 0;
      for (int i = l; i <= r; i++) s += a[i];
      cout << s << "\n";
    }
  }
}`,
  },
  {
    id: 'y3Zf3N9EdoeUzAYkdw76Q',
    title: '역전 수 세기 (BIT)',
    // O(N^2) naive: count inversions by brute force
    code: `#include <bits/stdc++.h>
using namespace std;
int main() {
  ios::sync_with_stdio(false);
  cin.tie(nullptr);
  int N; cin >> N;
  vector<int> a(N);
  for (auto& x : a) cin >> x;
  long long cnt = 0;
  for (int i = 0; i < N; i++)
    for (int j = i+1; j < N; j++)
      if (a[i] > a[j]) cnt++;
  cout << cnt << "\n";
}`,
  },
  {
    id: 'tFmWkN1KiZNmff2VDCPsN',
    title: '슬라이딩 윈도우 최솟값',
    // O(NK) naive: scan each window
    code: `#include <bits/stdc++.h>
using namespace std;
int main() {
  ios::sync_with_stdio(false);
  cin.tie(nullptr);
  int N, K; cin >> N >> K;
  vector<int> a(N);
  for (auto& x : a) cin >> x;
  for (int i = 0; i <= N-K; i++) {
    int m = INT_MAX;
    for (int j = i; j < i+K; j++) m = min(m, a[j]);
    cout << m << "\n";
  }
}`,
  },
  {
    id: 'RDj63-A0NmyW5u1a3BKCf',
    title: '슬라이딩 윈도우 최댓값',
    // O(NK) naive: scan each window
    code: `#include <bits/stdc++.h>
using namespace std;
int main() {
  ios::sync_with_stdio(false);
  cin.tie(nullptr);
  int N, K; cin >> N >> K;
  vector<int> a(N);
  for (auto& x : a) cin >> x;
  for (int i = 0; i <= N-K; i++) {
    int m = INT_MIN;
    for (int j = i; j < i+K; j++) m = max(m, a[j]);
    cout << m << "\n";
  }
}`,
  },
  {
    id: 'hptq8VQPJ78TZjgcsT3ze',
    title: '오큰수 (NGE)',
    // O(N^2) nested loop
    code: `#include <bits/stdc++.h>
using namespace std;
int main() {
  ios::sync_with_stdio(false);
  cin.tie(nullptr);
  int N; cin >> N;
  vector<int> a(N);
  for (auto& x : a) cin >> x;
  for (int i = 0; i < N; i++) {
    int res = -1;
    for (int j = i+1; j < N; j++) {
      if (a[j] > a[i]) { res = a[j]; break; }
    }
    cout << res;
    if (i < N-1) cout << " ";
  }
  cout << "\n";
}`,
  },
  {
    id: 'nfZCBk2KRRoQgtyFWEzP6',
    title: '히스토그램에서 가장 큰 직사각형',
    // O(N^2) nested loop
    code: `#include <bits/stdc++.h>
using namespace std;
int main() {
  ios::sync_with_stdio(false);
  cin.tie(nullptr);
  int N; cin >> N;
  vector<long long> h(N);
  for (auto& x : h) cin >> x;
  long long ans = 0;
  for (int i = 0; i < N; i++) {
    long long mn = h[i];
    for (int j = i; j < N; j++) {
      mn = min(mn, h[j]);
      ans = max(ans, mn * (j - i + 1));
    }
  }
  cout << ans << "\n";
}`,
  },
  {
    id: 'XRHZxCyY0H_keXwWRWCO1',
    title: 'K번째 수 (세그먼트 트리)',
    // O(NQ) naive: sort subarray for each query
    code: `#include <bits/stdc++.h>
using namespace std;
int main() {
  ios::sync_with_stdio(false);
  cin.tie(nullptr);
  int N, Q; cin >> N >> Q;
  vector<int> a(N);
  for (auto& x : a) cin >> x;
  while (Q--) {
    int l, r, k; cin >> l >> r >> k;
    vector<int> sub(a.begin()+l-1, a.begin()+r);
    sort(sub.begin(), sub.end());
    cout << sub[k-1] << "\n";
  }
}`,
  },
];

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Track last submit time to enforce 65s minimum gap
let lastSubmitTime = 0;

async function submit(problem) {
  // Enforce 65s gap from last successful submit
  const elapsed = Date.now() - lastSubmitTime;
  if (elapsed < 65000 && lastSubmitTime > 0) {
    const waitMs = 65000 - elapsed;
    console.log(`  Waiting ${Math.ceil(waitMs/1000)}s for rate limit window...`);
    await sleep(waitMs);
  }

  for (let attempt = 0; attempt < 5; attempt++) {
    const resp = await fetch(`${API_BASE}/api/v1/submissions`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        problemId: problem.id,
        language: 'cpp20',
        sourceCode: problem.code,
      }),
    });
    if (resp.status === 429) {
      const body = await resp.json().catch(() => ({}));
      const retryAfter = Number(resp.headers.get('retry-after') ?? 60);
      console.log(`  429 ${body.error ?? 'rateLimited'}, waiting ${retryAfter + 5}s...`);
      await sleep((retryAfter + 5) * 1000);
      // Reset lastSubmitTime so next iteration doesn't double-wait
      lastSubmitTime = 0;
      continue;
    }
    if (!resp.ok) {
      const text = await resp.text();
      throw new Error(`Submit failed ${resp.status}: ${text}`);
    }
    lastSubmitTime = Date.now();
    return resp.json();
  }
  throw new Error('Submit failed after 5 attempts');
}

async function poll(submissionId, maxWait = 120000) {
  const start = Date.now();
  while (Date.now() - start < maxWait) {
    await sleep(3000);
    const resp = await fetch(`${API_BASE}/api/v1/submissions/${submissionId}`, { headers });
    if (!resp.ok) throw new Error(`Poll failed ${resp.status}`);
    const envelope = await resp.json();
    const record = envelope.data ?? envelope;
    const verdict = record.status ?? record.verdict ?? record.result;
    if (!['pending', 'running', 'queued', 'judging'].includes(verdict)) {
      return record;
    }
    process.stdout.write('.');
  }
  throw new Error('Timeout waiting for verdict');
}

async function main() {
  const results = [];

  for (const problem of problems) {
    console.log(`\n[${problem.title}]`);
    console.log(`  Problem ID: ${problem.id}`);

    let submission;
    try {
      submission = await submit(problem);
    } catch (e) {
      console.error(`  Submit error: ${e.message}`);
      results.push({ title: problem.title, verdict: 'SUBMIT_ERROR', error: e.message });
      await sleep(3000);
      continue;
    }

    const subId = submission.id ?? submission.submissionId ?? submission.data?.id;
    console.log(`  Submission ID: ${subId}`);
    process.stdout.write('  Polling');

    let result;
    try {
      result = await poll(subId);
    } catch (e) {
      console.error(`\n  Poll error: ${e.message}`);
      results.push({ title: problem.title, verdict: 'POLL_ERROR', submissionId: subId });
      await sleep(3000);
      continue;
    }

    const verdict = result.status ?? result.verdict ?? result.result ?? 'UNKNOWN';
    const time = result.timeMs ?? result.executionTime ?? result.time ?? result.runtimeMs ?? '?';
    console.log(`\n  Verdict: ${verdict}  Time: ${time}ms`);
    console.log(`  Full response keys: ${Object.keys(result).join(', ')}`);

    results.push({ title: problem.title, verdict, time, submissionId: subId });

    // rate limit enforced at start of next submit() call
  }

  console.log('\n\n=== SUMMARY ===');
  console.log('Title | Verdict | Time(ms)');
  console.log('------|---------|--------');
  for (const r of results) {
    console.log(`${r.title} | ${r.verdict} | ${r.time ?? '-'}`);
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
