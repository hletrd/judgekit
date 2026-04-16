// TLE verification script — round 2 (fixed input parsing + remaining problems)

const API_BASE = 'https://algo.xylolabs.com';
const API_KEY = 'jk_d74b5170d9202945aa32a033c0b33b0bf106d1b7';

const headers = {
  'Authorization': `Bearer ${API_KEY}`,
  'Content-Type': 'application/json',
};

// Problems that need resubmission or were rate-limited
const PROBLEMS = [
  {
    title: '0-1 배낭 문제',
    id: 'nKyt4xMjHKFPGRxwr4lkl',
    // Input: first line N W, then N lines of "weight value"
    // Exponential 2^N backtracking — TLE at N=100
    code: `#include <bits/stdc++.h>
using namespace std;
int n, W;
vector<int> wt, val;
int best = 0;
void solve(int i, int curW, int curV) {
    if (i == n) { best = max(best, curV); return; }
    solve(i + 1, curW, curV);
    if (curW + wt[i] <= W) solve(i + 1, curW + wt[i], curV + val[i]);
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
    // O(N²) naive — TLE at N=100,000 with 1000ms limit
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
    // Each string on its own line
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
    title: '가장 큰 정사각형',
    id: 's4Djk1DWX1KhERSiBcvai',
    // Input: N M, then N rows of compact binary strings (no spaces)
    // Output: side length (not area!)
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
            for (int s = 1; i + s <= n && j + s <= m; s++) {
                bool ok = true;
                for (int r = i; r < i + s && ok; r++)
                    for (int c = j; c < j + s && ok; c++)
                        if (grid[r][c] == '0') ok = false;
                if (ok) ans = max(ans, s);
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
    // Fully naive: check all divisors from 2 to num-1 (no sqrt shortcut)
    // N≤1000 so this may still AC — constraints too small
    code: `#include <bits/stdc++.h>
using namespace std;
int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    int n; cin >> n;
    int count = 0;
    long long num = 1;
    while (count < n) {
        num++;
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
  const body = await resp.json();
  return body.data ?? body;
}

async function poll(submissionId, maxMs = 120000) {
  const start = Date.now();
  const TERMINAL = new Set(['accepted','wrong_answer','time_limit','memory_limit','runtime_error','compile_error']);
  while (Date.now() - start < maxMs) {
    await sleep(3000);
    const resp = await fetch(`${API_BASE}/api/v1/submissions/${submissionId}`, { headers });
    if (!resp.ok) throw new Error(`Poll failed ${resp.status}`);
    const body = await resp.json();
    const data = body.data ?? body;
    const status = data.status;
    process.stdout.write('.');
    if (TERMINAL.has(status)) { console.log(''); return data; }
  }
  console.log('');
  throw new Error('Polling timeout after 120s');
}

function verdictLabel(status) {
  const MAP = {
    accepted: 'AC', wrong_answer: 'WA', time_limit: 'TLE',
    memory_limit: 'MLE', runtime_error: 'RTE', compile_error: 'CE',
  };
  return MAP[status] ?? status?.toUpperCase() ?? '???';
}

async function main() {
  console.log('=== TLE Verification Run 2 ===\n');
  const results = [];

  for (const problem of PROBLEMS) {
    console.log(`\nSubmitting: ${problem.title} (${problem.id})`);
    let subId, finalData;
    try {
      const sub = await submit(problem.id, problem.code);
      subId = sub.id ?? sub.submissionId;
      console.log(`  Submission ID: ${subId}`);
      process.stdout.write('  Polling');
      finalData = await poll(subId);
    } catch (err) {
      console.error(`  ERROR: ${err.message}`);
      results.push({ title: problem.title, id: subId ?? '(error)', verdict: 'ERROR', time: null, note: err.message });
      await sleep(10000);
      continue;
    }

    const status = finalData.status;
    const time = finalData.executionTimeMs ?? null;
    const verdict = verdictLabel(status);
    let note = '';
    if (status === 'time_limit')    note = 'PASS — correctly TLE as expected';
    else if (status === 'accepted') note = 'FAIL — test cases not forcing intended algorithm (AC on naive)';
    else if (status === 'wrong_answer') note = 'FAIL — WA (check input format or logic)';
    else if (status === 'compile_error') note = 'FAIL — compile error';
    else if (status === 'runtime_error') note = 'FAIL — runtime error (stack overflow?)';
    else note = `Unexpected: ${status}`;

    console.log(`  Verdict: ${verdict}  Time: ${time != null ? time + 'ms' : 'N/A'}`);
    console.log(`  ${note}`);
    results.push({ title: problem.title, id: subId, verdict, time, note });

    // Respect rate limit: 10s between submissions
    console.log('  Waiting 10s before next submission...');
    await sleep(10000);
  }

  console.log('\n\n=== FINAL REPORT ===\n');
  for (const r of results) {
    console.log(`Problem       : ${r.title}`);
    console.log(`Submission ID : ${r.id}`);
    console.log(`Final Verdict : ${r.verdict}`);
    console.log(`Execution Time: ${r.time != null ? r.time + ' ms' : 'N/A'}`);
    console.log(`Analysis      : ${r.note}`);
    console.log('');
  }
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
