import { Card } from "@/app/components/ui/card";
import { Badge } from "@/app/components/ui/badge";
import { Button } from "@/app/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/app/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/components/ui/tabs";
import { X } from "lucide-react";

const openOrders = [
  {
    id: "ORD-2024-001",
    symbol: "BTCUSDT",
    side: "BUY",
    type: "LIMIT",
    price: 42500.00,
    size: 0.1,
    filled: 0,
    status: "OPEN",
    trader: "ProTrader_XYZ",
    time: "2 min ago",
  },
  {
    id: "ORD-2024-002",
    symbol: "ETHUSDT",
    side: "SELL",
    type: "LIMIT",
    price: 2300.00,
    size: 1.5,
    filled: 0,
    status: "OPEN",
    trader: null,
    time: "5 min ago",
  },
];

const filledOrders = [
  {
    id: "ORD-2024-003",
    symbol: "SOLUSDT",
    side: "BUY",
    type: "MARKET",
    price: 98.45,
    size: 45.2,
    filled: 45.2,
    status: "FILLED",
    trader: "QuantMaster_Pro",
    time: "15 min ago",
  },
  {
    id: "ORD-2024-004",
    symbol: "BTCUSDT",
    side: "BUY",
    type: "LIMIT",
    price: 43250.00,
    size: 0.156,
    filled: 0.156,
    status: "FILLED",
    trader: "ProTrader_XYZ",
    time: "1 hour ago",
  },
];

const cancelledOrders = [
  {
    id: "ORD-2024-005",
    symbol: "ETHUSDT",
    side: "BUY",
    type: "LIMIT",
    price: 2200.00,
    size: 2.0,
    filled: 0,
    status: "CANCELLED",
    trader: null,
    time: "3 hours ago",
  },
];

export function Orders() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold mb-1">Orders</h1>
        <p className="text-sm text-muted-foreground">View and manage your trading orders</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="p-4 space-y-2">
          <div className="text-xs text-muted-foreground uppercase tracking-wide">Open Orders</div>
          <div className="text-2xl font-semibold">{openOrders.length}</div>
        </Card>

        <Card className="p-4 space-y-2">
          <div className="text-xs text-muted-foreground uppercase tracking-wide">Filled Today</div>
          <div className="text-2xl font-semibold">12</div>
        </Card>

        <Card className="p-4 space-y-2">
          <div className="text-xs text-muted-foreground uppercase tracking-wide">Cancelled Today</div>
          <div className="text-2xl font-semibold">3</div>
        </Card>

        <Card className="p-4 space-y-2">
          <div className="text-xs text-muted-foreground uppercase tracking-wide">Partial Fills</div>
          <div className="text-2xl font-semibold">0</div>
        </Card>
      </div>

      {/* Orders Tabs */}
      <Card>
        <Tabs defaultValue="open" className="w-full">
          <div className="px-6 pt-6 border-b border-border">
            <TabsList>
              <TabsTrigger value="open">Open Orders</TabsTrigger>
              <TabsTrigger value="filled">Filled Orders</TabsTrigger>
              <TabsTrigger value="cancelled">Cancelled</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="open" className="m-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order ID</TableHead>
                  <TableHead>Symbol</TableHead>
                  <TableHead>Side</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead>Filled</TableHead>
                  <TableHead>Trader</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {openOrders.map((order, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-mono text-xs">{order.id}</TableCell>
                    <TableCell className="font-mono font-semibold">{order.symbol}</TableCell>
                    <TableCell>
                      <Badge 
                        variant="outline"
                        className={order.side === "BUY" ? "border-[#10B981]/50 text-[#10B981]" : "border-[#EF4444]/50 text-[#EF4444]"}
                      >
                        {order.side}
                      </Badge>
                    </TableCell>
                    <TableCell><Badge variant="secondary">{order.type}</Badge></TableCell>
                    <TableCell className="font-mono">${order.price.toFixed(2)}</TableCell>
                    <TableCell className="font-mono">{order.size}</TableCell>
                    <TableCell className="font-mono">{order.filled}</TableCell>
                    <TableCell>
                      {order.trader ? (
                        <Badge variant="outline" className="text-xs">{order.trader}</Badge>
                      ) : (
                        <span className="text-muted-foreground text-xs">Manual</span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">{order.time}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="outline" size="sm" className="gap-1">
                        <X className="size-3" />
                        Cancel
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TabsContent>

          <TabsContent value="filled" className="m-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order ID</TableHead>
                  <TableHead>Symbol</TableHead>
                  <TableHead>Side</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead>Trader</TableHead>
                  <TableHead>Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filledOrders.map((order, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-mono text-xs">{order.id}</TableCell>
                    <TableCell className="font-mono font-semibold">{order.symbol}</TableCell>
                    <TableCell>
                      <Badge 
                        variant="outline"
                        className={order.side === "BUY" ? "border-[#10B981]/50 text-[#10B981]" : "border-[#EF4444]/50 text-[#EF4444]"}
                      >
                        {order.side}
                      </Badge>
                    </TableCell>
                    <TableCell><Badge variant="secondary">{order.type}</Badge></TableCell>
                    <TableCell className="font-mono">${order.price.toFixed(2)}</TableCell>
                    <TableCell className="font-mono">{order.size}</TableCell>
                    <TableCell>
                      {order.trader ? (
                        <Badge variant="outline" className="text-xs">{order.trader}</Badge>
                      ) : (
                        <span className="text-muted-foreground text-xs">Manual</span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">{order.time}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TabsContent>

          <TabsContent value="cancelled" className="m-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order ID</TableHead>
                  <TableHead>Symbol</TableHead>
                  <TableHead>Side</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead>Trader</TableHead>
                  <TableHead>Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cancelledOrders.map((order, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-mono text-xs">{order.id}</TableCell>
                    <TableCell className="font-mono font-semibold">{order.symbol}</TableCell>
                    <TableCell>
                      <Badge 
                        variant="outline"
                        className={order.side === "BUY" ? "border-[#10B981]/50 text-[#10B981]" : "border-[#EF4444]/50 text-[#EF4444]"}
                      >
                        {order.side}
                      </Badge>
                    </TableCell>
                    <TableCell><Badge variant="secondary">{order.type}</Badge></TableCell>
                    <TableCell className="font-mono">${order.price.toFixed(2)}</TableCell>
                    <TableCell className="font-mono">{order.size}</TableCell>
                    <TableCell>
                      {order.trader ? (
                        <Badge variant="outline" className="text-xs">{order.trader}</Badge>
                      ) : (
                        <span className="text-muted-foreground text-xs">Manual</span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">{order.time}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
}
