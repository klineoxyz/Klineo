import { useState, useEffect } from "react";
import { Card } from "@/app/components/ui/card";
import { Badge } from "@/app/components/ui/badge";
import { Button } from "@/app/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/app/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/components/ui/tabs";
import { X, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "@/app/lib/toast";
import { useDemo } from "@/app/contexts/DemoContext";
import { LoadingWrapper } from "@/app/components/ui/loading-wrapper";
import { EmptyState } from "@/app/components/ui/empty-state";
import { ErrorState } from "@/app/components/ui/error-state";
import { formatDistanceToNow } from "date-fns";

interface Order {
  id: string;
  positionId?: string;
  symbol: string;
  side: "buy" | "sell";
  orderType: "market" | "limit";
  amount: number;
  price?: number | null;
  status: "pending" | "filled" | "cancelled" | "failed";
  exchangeOrderId?: string;
  createdAt: string;
  updatedAt: string;
}

interface OrdersResponse {
  orders: Order[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export function Orders() {
  const { isDemoMode, demoOrders, clearDemo } = useDemo();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const displayOrders = isDemoMode ? demoOrders : orders;

  const loadOrders = async (pageNum: number = 1) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await api.get<OrdersResponse>(`/api/orders?page=${pageNum}&limit=50`);
      setOrders(data.orders || []);
      setPage(data.page);
      setTotal(data.total);
      setTotalPages(data.totalPages);
    } catch (err: any) {
      const message = err?.message || "Failed to load orders";
      setError(message);
      if (!message.includes("VITE_API_BASE_URL not set")) {
        toast.error("Failed to load orders", { description: message });
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!isDemoMode) loadOrders(1);
    else setIsLoading(false);
  }, [isDemoMode]);

  // Categorize orders
  const openOrders = displayOrders.filter((o) => o.status === "pending");
  const filledOrders = displayOrders.filter((o) => o.status === "filled");
  const cancelledOrders = displayOrders.filter((o) => o.status === "cancelled");

  if (!isDemoMode && isLoading) {
    return (
      <div className="p-4 sm:p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-muted rounded w-1/3" />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-muted rounded" />
            ))}
          </div>
          <div className="h-64 bg-muted rounded" />
        </div>
      </div>
    );
  }

  if (!isDemoMode && error && orders.length === 0) {
    return (
      <div className="p-4 sm:p-6">
        <ErrorState
          title="Failed to load orders"
          message={error.includes("VITE_API_BASE_URL not set") 
            ? "Backend not configured. Please try again later."
            : error}
          action={
            <Button onClick={() => loadOrders(page)} variant="outline">
              Try Again
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold mb-1">Orders</h1>
          <p className="text-sm text-muted-foreground">View and manage your trading orders</p>
        </div>
        {isDemoMode && (
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="bg-primary/15 text-primary border-primary/30">Demo</Badge>
            <Button variant="ghost" size="sm" onClick={clearDemo}>Exit demo</Button>
          </div>
        )}
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card className="p-3 sm:p-4 space-y-2">
          <div className="text-xs text-muted-foreground uppercase tracking-wide">Open Orders</div>
          <div className="text-xl sm:text-2xl font-semibold">{openOrders.length}</div>
        </Card>

        <Card className="p-3 sm:p-4 space-y-2">
          <div className="text-xs text-muted-foreground uppercase tracking-wide">Filled</div>
          <div className="text-xl sm:text-2xl font-semibold">{filledOrders.length}</div>
        </Card>

        <Card className="p-3 sm:p-4 space-y-2">
          <div className="text-xs text-muted-foreground uppercase tracking-wide">Cancelled</div>
          <div className="text-xl sm:text-2xl font-semibold">{cancelledOrders.length}</div>
        </Card>

        <Card className="p-3 sm:p-4 space-y-2">
          <div className="text-xs text-muted-foreground uppercase tracking-wide">Total Orders</div>
          <div className="text-xl sm:text-2xl font-semibold">{isDemoMode ? displayOrders.length : total}</div>
        </Card>
      </div>

      {/* Orders Tabs */}
      {displayOrders.length === 0 ? (
        <Card className="p-6 sm:p-12">
          <EmptyState
            icon={X}
            title="No orders yet"
            description="Your trading orders will appear here once you start copying traders or place manual orders."
          />
        </Card>
      ) : (
        <Card>
          <Tabs defaultValue="open" className="w-full">
            <div className="px-4 sm:px-6 pt-4 sm:pt-6 border-b border-border">
              <TabsList className="flex-wrap h-auto gap-1 p-1 w-full sm:w-fit">
                <TabsTrigger value="open">Open ({openOrders.length})</TabsTrigger>
                <TabsTrigger value="filled">Filled ({filledOrders.length})</TabsTrigger>
                <TabsTrigger value="cancelled">Cancelled ({cancelledOrders.length})</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="open" className="m-0">
              {openOrders.length === 0 ? (
                <div className="p-6 sm:p-12 text-center text-muted-foreground">No open orders</div>
              ) : (
                <Table className="min-w-[640px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order ID</TableHead>
                      <TableHead>Symbol</TableHead>
                      <TableHead>Side</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Time</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {openOrders.map((order) => (
                      <TableRow key={order.id}>
                        <TableCell className="font-mono text-xs">{order.id.substring(0, 8)}...</TableCell>
                        <TableCell className="font-mono font-semibold">{order.symbol}</TableCell>
                        <TableCell>
                          <Badge 
                            variant="outline"
                            className={order.side === "buy" ? "border-[#10B981]/50 text-[#10B981]" : "border-[#EF4444]/50 text-[#EF4444]"}
                          >
                            {order.side.toUpperCase()}
                          </Badge>
                        </TableCell>
                        <TableCell><Badge variant="secondary">{order.orderType}</Badge></TableCell>
                        <TableCell className="font-mono">
                          {order.price ? `$${order.price.toFixed(2)}` : "Market"}
                        </TableCell>
                        <TableCell className="font-mono">{order.amount.toFixed(8)}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{order.status}</Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {formatDistanceToNow(new Date(order.createdAt), { addSuffix: true })}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </TabsContent>

            <TabsContent value="filled" className="m-0">
              {filledOrders.length === 0 ? (
                <div className="p-6 sm:p-12 text-center text-muted-foreground">No filled orders</div>
              ) : (
                <Table className="min-w-[640px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order ID</TableHead>
                      <TableHead>Symbol</TableHead>
                      <TableHead>Side</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Time</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filledOrders.map((order) => (
                      <TableRow key={order.id}>
                        <TableCell className="font-mono text-xs">{order.id.substring(0, 8)}...</TableCell>
                        <TableCell className="font-mono font-semibold">{order.symbol}</TableCell>
                        <TableCell>
                          <Badge 
                            variant="outline"
                            className={order.side === "buy" ? "border-[#10B981]/50 text-[#10B981]" : "border-[#EF4444]/50 text-[#EF4444]"}
                          >
                            {order.side.toUpperCase()}
                          </Badge>
                        </TableCell>
                        <TableCell><Badge variant="secondary">{order.orderType}</Badge></TableCell>
                        <TableCell className="font-mono">
                          {order.price ? `$${order.price.toFixed(2)}` : "Market"}
                        </TableCell>
                        <TableCell className="font-mono">{order.amount.toFixed(8)}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {formatDistanceToNow(new Date(order.createdAt), { addSuffix: true })}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </TabsContent>

            <TabsContent value="cancelled" className="m-0">
              {cancelledOrders.length === 0 ? (
                <div className="p-6 sm:p-12 text-center text-muted-foreground">No cancelled orders</div>
              ) : (
                <Table className="min-w-[640px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order ID</TableHead>
                      <TableHead>Symbol</TableHead>
                      <TableHead>Side</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Time</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cancelledOrders.map((order) => (
                      <TableRow key={order.id}>
                        <TableCell className="font-mono text-xs">{order.id.substring(0, 8)}...</TableCell>
                        <TableCell className="font-mono font-semibold">{order.symbol}</TableCell>
                        <TableCell>
                          <Badge 
                            variant="outline"
                            className={order.side === "buy" ? "border-[#10B981]/50 text-[#10B981]" : "border-[#EF4444]/50 text-[#EF4444]"}
                          >
                            {order.side.toUpperCase()}
                          </Badge>
                        </TableCell>
                        <TableCell><Badge variant="secondary">{order.orderType}</Badge></TableCell>
                        <TableCell className="font-mono">
                          {order.price ? `$${order.price.toFixed(2)}` : "Market"}
                        </TableCell>
                        <TableCell className="font-mono">{order.amount.toFixed(8)}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {formatDistanceToNow(new Date(order.createdAt), { addSuffix: true })}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </TabsContent>
          </Tabs>
          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 border-t">
              <div className="text-sm text-muted-foreground order-2 sm:order-1">
                Page {page} of {totalPages} ({total} total)
              </div>
              <div className="flex gap-2 order-1 sm:order-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => loadOrders(page - 1)}
                  disabled={page === 1}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => loadOrders(page + 1)}
                  disabled={page >= totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
