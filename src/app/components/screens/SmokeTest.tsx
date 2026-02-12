import { useState, useEffect } from "react";
import { Card } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { Badge } from "@/app/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/app/components/ui/table";
import { Alert, AlertDescription } from "@/app/components/ui/alert";
import { Input } from "@/app/components/ui/input";
import { Loader2, Copy, Trash2, CheckCircle2, XCircle, MinusCircle, ChevronDown, ChevronUp, Shield, Coins, Play } from "lucide-react";
import { useAuth } from "@/app/contexts/AuthContext";
import { api } from "@/lib/api";
import { runAllTests, runLaunchTests, runTestByName, smokeTests, type SmokeTestResult, sanitizeResponse } from "@/lib/smokeTests";
import { getSmokeTogglesState } from "@/lib/smokeTestToggles";
import { toast } from "sonner";

type EntitlementState = {
  entitlement: { profit_allowance: number; profit_used: number; remaining: number; status: string; package_name?: string | null };
} | null;

type MlmEvent = { type: string; gross: number; distributed_total: number; platform_total: number; marketing_total: number; created_at: string };

export function SmokeTest(props?: { embedInAdmin?: boolean }) {
  const { isAdmin } = useAuth();
  const isProduction = import.meta.env.PROD;
  const embedInAdmin = props?.embedInAdmin === true;

  const [results, setResults] = useState<SmokeTestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [expandedTest, setExpandedTest] = useState<string | null>(null);
  const [userInfo, setUserInfo] = useState<{ email: string; role: string } | null>(null);
  const [entitlement, setEntitlement] = useState<EntitlementState>(null);
  const [entitlementLoading, setEntitlementLoading] = useState(false);
  const [simulateAmount, setSimulateAmount] = useState("10");
  const [simulateLoading, setSimulateLoading] = useState(false);
  const [mlmEvents, setMlmEvents] = useState<MlmEvent[]>([]);
  const [mlmLoading, setMlmLoading] = useState(false);

  const apiBaseURL = import.meta.env.VITE_API_BASE_URL || '';
  const supabaseURL = import.meta.env.VITE_SUPABASE_URL || '';
  const maskedApiDomain = apiBaseURL ? (() => {
    try { return new URL(apiBaseURL).hostname; } catch { return '[masked]'; }
  })() : 'Not configured';
  const maskedSupabaseDomain = supabaseURL ? (() => {
    try { return new URL(supabaseURL).hostname; } catch { return '[masked]'; }
  })() : 'Not configured';

  useEffect(() => {
    const loadUserInfo = async () => {
      try {
        const data = await api.get<{ id: string; email: string; role: string }>('/api/auth/me');
        setUserInfo({ email: data.email, role: data.role });
      } catch {
        setUserInfo(null);
      }
    };
    loadUserInfo();
  }, []);

  const loadEntitlement = async () => {
    setEntitlementLoading(true);
    try {
      const data = await api.get<{ entitlement: { profit_allowance: number; profit_used: number; remaining: number; status: string; package_name?: string | null } }>('/api/entitlements/me');
      setEntitlement({ entitlement: data.entitlement });
    } catch {
      setEntitlement(null);
    } finally {
      setEntitlementLoading(false);
    }
  };

  useEffect(() => {
    if (userInfo) loadEntitlement();
  }, [userInfo?.role]);

  const loadMlm = async () => {
    if (!isAdmin) return;
    setMlmLoading(true);
    try {
      const data = await api.get<{ events: MlmEvent[] }>('/api/self-test/mlm-summary?limit=5');
      setMlmEvents(Array.isArray(data?.events) ? data.events : []);
    } catch {
      setMlmEvents([]);
    } finally {
      setMlmLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) loadMlm();
  }, [isAdmin]);

  const handleRunAll = async () => {
    setIsRunning(true);
    setResults([]);
    try {
      const testResults = await runAllTests();
      setResults(testResults);
    } catch (err: any) {
      toast.error("Failed to run tests", { description: err?.message });
    } finally {
      setIsRunning(false);
    }
  };

  const handleRunLaunch = async () => {
    setIsRunning(true);
    setResults([]);
    try {
      const testResults = await runLaunchTests();
      setResults(testResults);
      toast.success("Launch preset complete", { description: `${testResults.filter(r => r.status === "PASS").length} pass, ${testResults.filter(r => r.status === "FAIL").length} fail, ${testResults.filter(r => r.status === "SKIP").length} skip` });
    } catch (err: any) {
      toast.error("Launch preset failed", { description: err?.message });
    } finally {
      setIsRunning(false);
    }
  };

  const handleRunSingle = async (testName: string) => {
    setIsRunning(true);
    try {
      const result = await runTestByName(testName);
      if (result) {
        setResults(prev => {
          const existing = prev.find(r => r.name === testName);
          if (existing) {
            return prev.map(r => r.name === testName ? result : r);
          }
          return [...prev, result];
        });
      }
    } catch (err: any) {
      toast.error("Failed to run test", { description: err?.message });
    } finally {
      setIsRunning(false);
    }
  };

  const handleCopyReport = () => {
    const toggles = getSmokeTogglesState();
    // Create fully sanitized report (no secrets; apiKey/apiSecret/token redacted)
    const report = {
      reportId: crypto.randomUUID?.() ?? `report-${Date.now()}`,
      timestamp: new Date().toISOString(),
      toggles: { exchangeSmokeTests: toggles.exchange, runnerCronSecretTest: toggles.runnerCron },
      environment: {
        api_domain: maskedApiDomain,
        supabase_domain: maskedSupabaseDomain,
        user_role: userInfo?.role || 'none',
      },
      summary: {
        total: results.length,
        passed: results.filter(r => r.status === 'PASS').length,
        failed: results.filter(r => r.status === 'FAIL').length,
        skipped: results.filter(r => r.status === 'SKIP').length,
      },
      results: results.map(r => {
        const sanitized: any = {
          name: r.name,
          status: r.status,
          httpCode: r.httpCode,
          latency: r.latency,
          message: r.message
        };
        // Sanitize details if present
        if (r.details) {
          sanitized.details = {
            requestPath: r.details.requestPath,
            response: sanitizeResponse(r.details.response),
            error: r.details.error
          };
        }
        return sanitized;
      })
    };

    navigator.clipboard.writeText(JSON.stringify(report, null, 2));
    toast.success("Report copied to clipboard");
  };

  const handleClear = () => {
    setResults([]);
    setExpandedTest(null);
  };

  const handleSimulateProfit = async () => {
    if (!isAdmin) return;
    const n = Math.min(100000, Math.max(0.01, Number(simulateAmount)));
    if (Number.isNaN(n) || n <= 0) {
      toast.error("Invalid amount", { description: "Use a number between 0 and 100000." });
      return;
    }
    setSimulateLoading(true);
    try {
      await api.post('/api/self-test/simulate-profit', { amount: n });
      toast.success("Profit simulated");
      loadEntitlement();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Request failed";
      if (String(msg).includes("404") || String(msg).includes("Not found")) {
        toast.info("Self-test disabled", { description: "Self-test endpoints are off in production." });
      } else {
        toast.error("Simulate failed", { description: String(msg) });
      }
    } finally {
      setSimulateLoading(false);
    }
  };

  const handleRunGatingTest = async () => {
    const name = 'Allowance gating (402 ALLOWANCE_EXCEEDED)';
    setIsRunning(true);
    try {
      const result = await runTestByName(name);
      if (result) {
        setResults(prev => {
          const i = prev.findIndex(r => r.name === name);
          if (i >= 0) return prev.map((r, j) => (j === i ? result : r));
          return [...prev, result];
        });
      }
    } catch (err: unknown) {
      toast.error("Gating test failed", { description: err instanceof Error ? err.message : String(err) });
    } finally {
      setIsRunning(false);
    }
  };

  const getStatusBadge = (status: SmokeTestResult['status']) => {
    switch (status) {
      case 'PASS':
        return <Badge className="bg-[#10B981] text-white">PASS</Badge>;
      case 'FAIL':
        return <Badge className="bg-[#EF4444] text-white">FAIL</Badge>;
      case 'SKIP':
        return <Badge variant="secondary">SKIP</Badge>;
    }
  };

  const getOverallStatus = () => {
    if (results.length === 0) {
      return {
        status: 'NOT RUN',
        badge: <Badge variant="outline">NOT RUN</Badge>,
        passed: 0,
        failed: 0,
        skipped: 0,
        total: 0
      };
    }
    const passed = results.filter(r => r.status === 'PASS').length;
    const failed = results.filter(r => r.status === 'FAIL').length;
    const skipped = results.filter(r => r.status === 'SKIP').length;
    
    if (failed === 0) {
      return {
        status: 'ALL PASS',
        badge: <Badge className="bg-[#10B981] text-white">ALL PASS</Badge>,
        passed,
        failed,
        skipped,
        total: results.length
      };
    }
    return {
      status: 'SOME FAIL',
      badge: <Badge className="bg-[#EF4444] text-white">SOME FAIL</Badge>,
      passed,
      failed,
      skipped,
      total: results.length
    };
  };

  const overallStatus = getOverallStatus();

  // In production, hide unless admin and env enabled — but when embedded in Admin tab, always show so Run button is visible
  if (!embedInAdmin && isProduction && (!isAdmin || import.meta.env.VITE_ENABLE_SMOKE_TEST_PAGE !== 'true')) return null;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold mb-1">KLINEO Smoke Test</h1>
        <p className="text-sm text-muted-foreground">Test backend endpoints and production setup</p>
      </div>

      {/* Run actions - visible at top so Admin tab has an obvious Run button */}
      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={handleRunAll} disabled={isRunning} className="gap-2">
          {isRunning ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
          Run All Tests
        </Button>
        <Button onClick={handleRunLaunch} disabled={isRunning} variant="secondary" className="gap-2">
          {isRunning ? <Loader2 className="size-4 animate-spin" /> : <Play className="size-4" />}
          Run All (Launch)
        </Button>
      </div>

      {/* Environment Info */}
      <Card className="p-4">
        <h3 className="font-semibold mb-3">Environment</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">API Domain:</span>
            <span className="ml-2 font-mono">{maskedApiDomain}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Supabase Domain:</span>
            <span className="ml-2 font-mono">{maskedSupabaseDomain}</span>
          </div>
          <div>
            <span className="text-muted-foreground">User Email:</span>
            <span className="ml-2">{userInfo?.email || 'Not logged in'}</span>
          </div>
          <div>
            <span className="text-muted-foreground">User Role:</span>
            <span className="ml-2">{userInfo?.role || 'none'}</span>
          </div>
        </div>
      </Card>

      {/* Entitlement */}
      <Card className="p-4">
        <h3 className="font-semibold mb-3 flex items-center gap-2">
          <Shield className="size-4" /> Entitlement
        </h3>
        {entitlementLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Loading…
          </div>
        ) : entitlement?.entitlement ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Allowance</span>
              <div className="font-mono">{Number(entitlement.entitlement.profit_allowance).toFixed(2)}</div>
            </div>
            <div>
              <span className="text-muted-foreground">Used</span>
              <div className="font-mono">{Number(entitlement.entitlement.profit_used).toFixed(2)}</div>
            </div>
            <div>
              <span className="text-muted-foreground">Remaining</span>
              <div className="font-mono">{Number(entitlement.entitlement.remaining).toFixed(2)}</div>
            </div>
            <div>
              <span className="text-muted-foreground">Status</span>
              <div><Badge variant={entitlement.entitlement.status === 'active' ? 'default' : 'secondary'}>{entitlement.entitlement.status}</Badge></div>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No entitlement data. Log in and fetch to see allowance/used/remaining.</p>
        )}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={loadEntitlement} disabled={entitlementLoading}>
            Refresh
          </Button>
          {isAdmin && (
            <>
              <Input
                type="number"
                min={0.01}
                max={100000}
                step={1}
                value={simulateAmount}
                onChange={(e) => setSimulateAmount(e.target.value)}
                className="w-24 h-8 text-sm"
                placeholder="Amount"
              />
              <Button size="sm" onClick={handleSimulateProfit} disabled={simulateLoading}>
                {simulateLoading ? <Loader2 className="size-4 animate-spin" /> : <Coins className="size-4" />}
                Simulate Profit
              </Button>
              <Button variant="secondary" size="sm" onClick={handleRunGatingTest} disabled={isRunning}>
                Run Gating Test
              </Button>
            </>
          )}
        </div>
      </Card>

      {/* MLM Events (admin only, sanitized) */}
      {isAdmin && (
        <Card className="p-4">
          <h3 className="font-semibold mb-3">MLM Events</h3>
          {mlmLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> Loading…
            </div>
          ) : mlmEvents.length === 0 ? (
            <p className="text-sm text-muted-foreground">No distribution events, or self-test disabled.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Gross</TableHead>
                    <TableHead>Distributed</TableHead>
                    <TableHead>Platform</TableHead>
                    <TableHead>Marketing</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mlmEvents.map((ev, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-mono text-xs">{ev.type}</TableCell>
                      <TableCell className="font-mono text-xs">{Number(ev.gross).toFixed(2)}</TableCell>
                      <TableCell className="font-mono text-xs">{Number(ev.distributed_total).toFixed(2)}</TableCell>
                      <TableCell className="font-mono text-xs">{Number(ev.platform_total).toFixed(2)}</TableCell>
                      <TableCell className="font-mono text-xs">{Number(ev.marketing_total).toFixed(2)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{ev.created_at ? new Date(ev.created_at).toISOString().slice(0, 19) : '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          <Button variant="ghost" size="sm" className="mt-2" onClick={loadMlm} disabled={mlmLoading}>
            Refresh MLM
          </Button>
        </Card>
      )}

      {/* Toggles used for this run (when results exist) */}
      {results.length > 0 && (() => {
        const toggles = getSmokeTogglesState();
        return (
          <div className="rounded border border-border bg-muted/30 px-4 py-2 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">Toggles for live tests: </span>
            <span>Exchange smoke tests = {toggles.exchange ? 'ON' : 'OFF'}</span>
            <span className="mx-2">|</span>
            <span>Runner cron secret test = {toggles.runnerCron ? 'ON' : 'OFF'}</span>
            <span className="ml-2">— Skips show reason (flag, auth, or missing header) in Message column.</span>
          </div>
        );
      })()}

      {/* Overall Status Banner */}
      <Card className={`p-4 ${
        overallStatus.status === 'ALL PASS' ? 'bg-[#10B981]/10 border-[#10B981]/20' :
        overallStatus.status === 'SOME FAIL' ? 'bg-[#EF4444]/10 border-[#EF4444]/20' :
        'bg-muted/50'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium">Overall Status:</span>
            {overallStatus.badge}
            {overallStatus.total > 0 && (
              <span className="text-sm text-muted-foreground">
                {overallStatus.passed} passed, {overallStatus.failed} failed, {overallStatus.skipped} skipped (total: {overallStatus.total})
              </span>
            )}
          </div>
        </div>
      </Card>

      {/* Action Buttons */}
      <div className="flex items-center justify-end gap-2">
        <Button onClick={handleRunAll} disabled={isRunning} className="gap-2">
          {isRunning ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
          Run All Tests
        </Button>
        <Button onClick={handleRunLaunch} disabled={isRunning} variant="secondary" className="gap-2">
          {isRunning ? <Loader2 className="size-4 animate-spin" /> : <Play className="size-4" />}
          Run All (Launch)
        </Button>
        <Button onClick={handleCopyReport} variant="outline" disabled={results.length === 0} className="gap-2">
          <Copy className="size-4" />
          Copy Report
        </Button>
        <Button onClick={handleClear} variant="outline" disabled={results.length === 0} className="gap-2">
          <Trash2 className="size-4" />
          Clear Results
        </Button>
      </div>

      {/* Test Buttons */}
      <Card className="p-4">
        <h3 className="font-semibold mb-3">Individual Tests</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
          {smokeTests.map((test) => {
            const result = results.find(r => r.name === test.name);
            const isRunningThis = isRunning && !result;
            return (
              <Button
                key={test.name}
                variant="outline"
                size="sm"
                onClick={() => handleRunSingle(test.name)}
                disabled={isRunningThis}
                className="justify-start gap-2"
              >
                {isRunningThis ? (
                  <Loader2 className="size-3 animate-spin" />
                ) : result?.status === 'PASS' ? (
                  <CheckCircle2 className="size-3 text-[#10B981]" />
                ) : result?.status === 'FAIL' ? (
                  <XCircle className="size-3 text-[#EF4444]" />
                ) : result?.status === 'SKIP' ? (
                  <MinusCircle className="size-3 text-muted-foreground" />
                ) : null}
                <span className="truncate">{test.name}</span>
              </Button>
            );
          })}
        </div>
      </Card>

      {/* Results Table */}
      {results.length > 0 && (
        <Card>
          <div className="p-4 border-b">
            <h3 className="font-semibold">Test Results</h3>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Test Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>HTTP Code</TableHead>
                <TableHead>Latency</TableHead>
                <TableHead>Message</TableHead>
                <TableHead className="text-right">Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {results.map((result) => (
                <>
                  <TableRow key={result.name}>
                    <TableCell className="font-medium">{result.name}</TableCell>
                    <TableCell>{getStatusBadge(result.status)}</TableCell>
                    <TableCell className="font-mono text-sm">
                      {result.httpCode || '-'}
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {result.latency ? `${result.latency}ms` : '-'}
                    </TableCell>
                    <TableCell className="text-sm">{result.message}</TableCell>
                    <TableCell className="text-right">
                      {result.details && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setExpandedTest(expandedTest === result.name ? null : result.name)}
                        >
                          {expandedTest === result.name ? (
                            <ChevronUp className="size-4" />
                          ) : (
                            <ChevronDown className="size-4" />
                          )}
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                  {expandedTest === result.name && result.details && (
                    <TableRow>
                      <TableCell colSpan={6} className="bg-muted/50">
                        <div className="p-4 space-y-2">
                          {result.details.requestPath && (
                            <div>
                              <span className="text-sm font-medium">Request Path:</span>
                              <code className="ml-2 text-xs font-mono">{result.details.requestPath}</code>
                            </div>
                          )}
                          {result.details.response && (
                            <div>
                              <span className="text-sm font-medium">Response:</span>
                              <pre className="mt-1 p-2 bg-background rounded text-xs overflow-auto max-h-48">
                                {JSON.stringify(sanitizeResponse(result.details.response), null, 2)}
                              </pre>
                            </div>
                          )}
                          {result.details.error && (
                            <div>
                              <span className="text-sm font-medium text-[#EF4444]">Error:</span>
                              <pre className="mt-1 p-2 bg-background rounded text-xs overflow-auto max-h-48 text-[#EF4444]">
                                {result.details.error}
                              </pre>
                            </div>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Info Alert */}
      {!userInfo && (
        <Alert>
          <AlertDescription>
            Some tests require authentication. Please log in to run all tests.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
