// TLE verification script for naive DP implementations
// Target: algo.xylolabs.com

const API_BASE = 'https://algo.xylolabs.com';
const API_KEY = 'jk_d74b5170d9202945aa32a033c0b33b0bf106d1b7';

const headers = {
  'Authorization': `Bearer ${API_KEY}`,
  'Content-Type': 'application/json',
};

const PROBLEMS = [
  {
    title: '최대 부분 증가 수열',
    id: 'VhpKDnPCGuy43c_bS31ku',
    // Naive O(N²) DP — should TLE at N=100,000
    code: `#include <bits/stdc++.h>
using namespace std;
int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    int n; cin >> n;
    vector<int> a(n);
    for (auto& x : a) cin >> x;
    vector<int> dp(n, 1);
    for (int i = 1; i < n; i++)
        for (int j = 0; j < i; j++)
            if (a[j] < a[i]) dp[i] = max(dp[i], dp[j] + 1);
    cout << *max_element(dp.begin(), dp.end()) << endl;
}`,
  },
  {
    title: '가장 긴 증가하는 부분 수열 (이분 탐색)',
    id: 'R637tgbDKqQyFnQkkys4r',
    // Submit O(N²) instead of the required O(N log N) — should TLE
    code: `#include <bits/stdc++.h>
using namespace std;
int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    int n; cin >> n;
    vector<int> a(n);
    for (auto& x : a) cin >> x;
    vector<int> dp(n, 1);
    for (int i = 1; i < n; i++)
        for (int j = 0; j < i; j++)
            if (a[j] < a[i]) dp[i] = max(dp[i], dp[j] + 1);
    cout << *max_element(dp.begin(), dp.end()) << endl;
}`,
  },
  {
    title: '0-1 배낭 문제',
    id: 'nKyt4xMjHKFPGRxwr4lkl',
    // Exponential backtracking 2^N — TLE at N=100
    code: `#include <bits/stdc++.h>
using namespace std;
int n, W;
vector<int> wt, val;
int best = 0;
void solve(int i, int curW, int curV) {
    if (i == n) {
        best = max(best, curV);
        return;
    }
    // Don't take item i
    solve(i + 1, curW, curV);
    // Take item i if possible
    if (curW + wt[i] <= W)
        solve(i + 1, curW + wt[i], curV + val[i]);
}
int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    cin >> n >> W;
    wt.resize(n); val.resize(n);
    for (int i = 0; i < n; i++) cin >> wt[i] >> val[i];
    solve(0, 0, 0);
    cout << best << endl;
}`,
  },
  {
    title: '연속합',
    id: '5hB41IrZlmbj5seIWeEPg',
    // Naive O(N²) — TLE at N=100,000
    code: `#include <bits/stdc++.h>
using namespace std;
int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    int n; cin >> n;
    vector<long long> a(n);
    for (auto& x : a) cin >> x;
    long long best = a[0];
    for (int i = 0; i < n; i++) {
        long long s = 0;
        for (int j = i; j < n; j++) {
            s += a[j];
            best = max(best, s);
        }
    }
    cout << best << endl;
}`,
  },
  {
    title: '최장 공통 부분 수열 (LCS)',
    id: 'AGmM_hHGFp6_sWrphE1h0',
    // O(2^N) recursion without memoization — TLE at length=1000
    code: `#include <bits/stdc++.h>
using namespace std;
string a, b;
int lcs(int i, int j) {
    if (i < 0 || j < 0) return 0;
    if (a[i] == b[j]) return 1 + lcs(i - 1, j - 1);
    return max(lcs(i - 1, j), lcs(i, j - 1));
}
int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    cin >> a >> b;
    cout << lcs((int)a.size() - 1, (int)b.size() - 1) << endl;
}`,
  },
  {
    title: '편집 거리',
    id: '3CQuXovkhQYDAVGCjr8An',
    // Naive recursion without memoization — TLE at length=1000
    code: `#include <bits/stdc++.h>
using namespace std;
string a, b;
int edit(int i, int j) {
    if (i == 0) return j;
    if (j == 0) return i;
    if (a[i - 1] == b[j - 1]) return edit(i - 1, j - 1);
    return 1 + min({edit(i - 1, j), edit(i, j - 1), edit(i - 1, j - 1)});
}
int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    cin >> a >> b;
    cout << edit((int)a.size(), (int)b.size()) << endl;
}`,
  },
  {
    title: '가장 큰 정사각형',
    id: 's4Djk1DWX1KhERSiBcvai',
    // O(N² M²) nested scan — TLE at N=M=1000
    code: `#include <bits/stdc++.h>
using namespace std;
int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    int n, m; cin >> n >> m;
    vector<string> grid(n);
    for (auto& row : grid) cin >> row;
    int ans = 0;
    for (int i = 0; i < n; i++) {
        for (int j = 0; j < m; j++) {
            if (grid[i][j] == '0') continue;
            // Try all square sizes
            for (int s = 1; i + s <= n && j + s <= m; s++) {
                bool ok = true;
                for (int r = i; r < i + s && ok; r++)
                    for (int c = j; c < j + s && ok; c++)
                        if (grid[r][c] == '0') ok = false;
                if (ok) ans = max(ans, s * s);
                else break;
            }
        }
    }
    cout << ans << endl;
}`,
  },
  {
    title: 'N번째 소수',
    id: 'G2Y71EkvSeNjApaL1CQ16',
    // Trial division for every candidate (no sieve) — naive but may not TLE at N=1000
    code: `#include <bits/stdc++.h>
using namespace std;
bool isPrime(long long n) {
    if (n < 2) return false;
    for (long long i = 2; i * i <= n; i++)
        if (n % i == 0) return false;
    return true;
}
int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    int n; cin >> n;
    int count = 0;
    long long num = 1;
    while (count < n) {
        num++;
        // Extra naive: check all divisors up to num-1
        bool prime = true;
        for (long long i = 2; i < num; i++) {
            if (num % i == 0) { prime = false; break; }
        }
        if (prime) count++;
    }
    cout << num << endl;
}`,
  },
  {
    title: '병합 정렬과 역전 수',
    id: 'qcHFBVV183x9cbh3sTURY',
    // O(N²) naive inversion counting — TLE at N=500,000
    code: `#include <bits/stdc++.h>
using namespace std;
int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    int n; cin >> n;
    vector<long long> a(n);
    for (auto& x : a) cin >> x;
    long long cnt = 0;
    for (int i = 0; i < n; i++)
        for (int j = i + 1; j < n; j++)
            if (a[i] > a[j]) cnt++;
    cout << cnt << endl;
}`,
  },
];

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function submit(problemId, sourceCode) {
  const resp = await fetch(`${API_BASE}/api/v1/submissions`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ problemId, language: 'cpp23', sourceCode }),
  });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Submit failed ${resp.status}: ${text}`);
  }
  return resp.json();
}

async function poll(submissionId, maxMs = 30000) {
  const start = Date.now();
  const TERMINAL = new Set(['accepted','wrong_answer','time_limit','memory_limit','runtime_error','compile_error']);
  while (Date.now() - start < maxMs) {
    await sleep(2000);
    const resp = await fetch(`${API_BASE}/api/v1/submissions/${submissionId}`, { headers });
    if (!resp.ok) throw new Error(`Poll failed ${resp.status}`);
    const data = await resp.json();
    const status = data.status ?? data.verdict ?? data.result;
    if (TERMINAL.has(status)) return data;
  }
  throw new Error('Polling timeout after 30s');
}

function verdictLabel(status) {
  const MAP = {
    accepted: 'AC',
    wrong_answer: 'WA',
    time_limit: 'TLE',
    memory_limit: 'MLE',
    runtime_error: 'RTE',
    compile_error: 'CE',
  };
  return MAP[status] ?? status?.toUpperCase() ?? '???';
}

async function main() {
  console.log('=== TLE Verification Run ===\n');
  const results = [];

  for (const problem of PROBLEMS) {
    console.log(`Submitting: ${problem.title} (${problem.id})`);
    let subId, finalData;
    try {
      const sub = await submit(problem.id, problem.code);
      subId = sub.id ?? sub.submissionId ?? sub.data?.id;
      console.log(`  Submission ID: ${subId}`);
      finalData = await poll(subId);
    } catch (err) {
      console.error(`  ERROR: ${err.message}`);
      results.push({ title: problem.title, id: '(error)', verdict: 'ERROR', time: null, note: err.message });
      await sleep(2500);
      continue;
    }

    const status = finalData.status ?? finalData.verdict ?? finalData.result;
    const time = finalData.executionTimeMs ?? finalData.time ?? finalData.timeMs ?? finalData.runtime ?? null;
    const verdict = verdictLabel(status);
    let note = '';

    if (status === 'time_limit') {
      note = 'PASS — correctly TLE as expected';
    } else if (status === 'accepted') {
      note = 'FAIL — test cases not forcing intended algorithm (AC on naive)';
    } else if (status === 'wrong_answer') {
      note = 'FAIL — WA (naive may be logically wrong, not necessarily due to complexity)';
    } else if (status === 'compile_error') {
      note = 'FAIL — compile error';
    } else if (status === 'runtime_error') {
      note = 'FAIL — runtime error (possibly stack overflow on recursion)';
    } else {
      note = `Unexpected verdict: ${status}`;
    }

    console.log(`  Verdict: ${verdict}  Time: ${time != null ? time + 'ms' : 'N/A'}`);
    console.log(`  Note: ${note}\n`);
    results.push({ title: problem.title, id: subId, verdict, time, note });

    // Rate limit: wait 2.5s between submissions
    await sleep(2500);
  }

  console.log('\n=== FINAL REPORT ===\n');
  for (const r of results) {
    console.log(`Problem: ${r.title}`);
    console.log(`  Submission ID : ${r.id}`);
    console.log(`  Final Verdict : ${r.verdict}`);
    console.log(`  Execution Time: ${r.time != null ? r.time + ' ms' : 'N/A'}`);
    console.log(`  Analysis      : ${r.note}`);
    console.log('');
  }
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
