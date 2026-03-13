import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// =============================================================================
// SEEDING FUNCTIONS
// =============================================================================

/**
 * Seed branches table
 * Creates `scale` branches with bid 1..scale
 */
export const seedBranches = mutation({
  args: { scale: v.number() },
  handler: async (ctx, { scale }) => {
    // Check if already seeded
    const existing = await ctx.db
      .query("branches")
      .withIndex("by_bid", (q) => q.eq("bid", 1))
      .unique();
    
    if (existing) {
      console.log("Branches already seeded, skipping...");
      return { seeded: 0, skipped: true };
    }

    for (let bid = 1; bid <= scale; bid++) {
      await ctx.db.insert("branches", {
        bid,
        bbalance: 0,
        filler: "".padEnd(88, " "), // char(88) filler
      });
    }

    return { seeded: scale, skipped: false };
  },
});

/**
 * Seed tellers table
 * Creates 10 tellers per branch (10 * scale total)
 */
export const seedTellers = mutation({
  args: { scale: v.number() },
  handler: async (ctx, { scale }) => {
    // Check if already seeded
    const existing = await ctx.db
      .query("tellers")
      .withIndex("by_tid", (q) => q.eq("tid", 1))
      .unique();

    if (existing) {
      console.log("Tellers already seeded, skipping...");
      return { seeded: 0, skipped: true };
    }

    let count = 0;
    for (let bid = 1; bid <= scale; bid++) {
      // Get branch document reference
      const branch = await ctx.db
        .query("branches")
        .withIndex("by_bid", (q) => q.eq("bid", bid))
        .unique();

      if (!branch) {
        throw new Error(`Branch ${bid} not found. Run seedBranches first.`);
      }

      // 10 tellers per branch
      for (let t = 1; t <= 10; t++) {
        const tid = (bid - 1) * 10 + t;
        await ctx.db.insert("tellers", {
          tid,
          bid,
          branchId: branch._id,
          tbalance: 0,
          filler: "".padEnd(84, " "), // char(84) filler
        });
        count++;
      }
    }

    return { seeded: count, skipped: false };
  },
});

/**
 * Seed accounts in batches
 * Convex mutations have a 1-second timeout, so we batch account creation
 * 
 * Call multiple times with different startAid values:
 *   seedAccountBatch({ startAid: 1, count: 5000, scale: 10 })
 *   seedAccountBatch({ startAid: 5001, count: 5000, scale: 10 })
 *   etc.
 */
export const seedAccountBatch = mutation({
  args: {
    startAid: v.number(),
    count: v.number(),
    scale: v.number(),
  },
  handler: async (ctx, { startAid, count, scale }) => {
    // Check if this batch already exists
    const existing = await ctx.db
      .query("accounts")
      .withIndex("by_aid", (q) => q.eq("aid", startAid))
      .unique();

    if (existing) {
      console.log(`Account ${startAid} already exists, skipping batch...`);
      return { seeded: 0, skipped: true };
    }

    // Pre-fetch all branches for efficiency
    const branches = await ctx.db.query("branches").collect();
    const branchMap = new Map(branches.map((b) => [b.bid, b._id]));

    let seeded = 0;
    for (let i = 0; i < count; i++) {
      const aid = startAid + i;
      
      // Distribute accounts across branches (round-robin)
      const bid = ((aid - 1) % scale) + 1;
      const branchId = branchMap.get(bid);

      if (!branchId) {
        throw new Error(`Branch ${bid} not found. Run seedBranches first.`);
      }

      await ctx.db.insert("accounts", {
        aid,
        bid,
        branchId,
        abalance: 0,
        filler: "".padEnd(84, " "), // char(84) filler
      });
      seeded++;
    }

    return { seeded, skipped: false };
  },
});

/**
 * Seed history with random historical data
 * Similar to: INSERT INTO history SELECT random()... FROM accounts LIMIT count
 */
export const seedHistory = mutation({
  args: { count: v.number() },
  handler: async (ctx, { count }) => {
    // Get some accounts to reference
    const accounts = await ctx.db.query("accounts").take(Math.min(count, 1000));

    if (accounts.length === 0) {
      throw new Error("No accounts found. Run seedAccountBatch first.");
    }

    let seeded = 0;
    for (let i = 0; i < count; i++) {
      const account = accounts[i % accounts.length];
      const tid = Math.floor(Math.random() * 100) + 1;
      const delta = Math.floor(Math.random() * 1000) - 500;

      // Insert history record and use its document ID as hid
      const historyId = await ctx.db.insert("history", {
        // hid: "", // Temporary placeholder
        tid,
        bid: account.bid,
        aid: account.aid,
        delta,
        mtime: Date.now(),
        filler: "".padEnd(22, " "), // char(22) filler
        accountId: account._id,
        branchId: account.branchId,
      });

      // Update hid to use the document's own ID
      // await ctx.db.patch(historyId, { hid: historyId });
      seeded++;
    }

    return { seeded };
  },
});

// =============================================================================
// TPC-B TRANSACTION
// =============================================================================

/**
 * The main TPC-B transaction
 * 
 * This is the equivalent of the pgbench transaction:
 *   BEGIN;
 *   UPDATE accounts SET abalance = abalance + :delta WHERE aid = :aid;
 *   SELECT abalance FROM accounts WHERE aid = :aid;
 *   UPDATE tellers SET tbalance = tbalance + :delta WHERE tid = :tid;
 *   UPDATE branches SET bbalance = bbalance + :delta WHERE bid = :bid;
 *   INSERT INTO history (tid, bid, aid, delta, mtime) VALUES (:tid, :bid, :aid, :delta, CURRENT_TIMESTAMP);
 *   COMMIT;
 * 
 * In Convex, the entire mutation is atomic - no explicit BEGIN/COMMIT needed.
 * Convex uses OCC (Optimistic Concurrency Control) and will retry on conflicts.
 */
export const tpcbTransaction = mutation({
  args: {
    aid: v.number(), // Account ID: 1 to 100000 * scale
    tid: v.number(), // Teller ID: 1 to 10 * scale
    bid: v.number(), // Branch ID: 1 to scale
    delta: v.number(), // Transaction amount: -500 to 500 (or -5000 to 5000)
  },
  handler: async (ctx, { aid, tid, bid, delta }) => {
    // 1. Update account balance
    const account = await ctx.db
      .query("accounts")
      .withIndex("by_aid", (q) => q.eq("aid", aid))
      .unique();

    if (!account) {
      throw new Error(`Account ${aid} not found`);
    }

    const newAbalance = account.abalance + delta;
    await ctx.db.patch(account._id, { abalance: newAbalance });

    // 2. SELECT abalance (we already have it from step 1)
    // In the original pgbench, this is a separate SELECT statement
    // Here we just use the value we computed

    // 3. Update teller balance
    const teller = await ctx.db
      .query("tellers")
      .withIndex("by_tid", (q) => q.eq("tid", tid))
      .unique();

    if (!teller) {
      throw new Error(`Teller ${tid} not found`);
    }

    await ctx.db.patch(teller._id, { tbalance: teller.tbalance + delta });

    // 4. Update branch balance
    const branch = await ctx.db
      .query("branches")
      .withIndex("by_bid", (q) => q.eq("bid", bid))
      .unique();

    if (!branch) {
      throw new Error(`Branch ${bid} not found`);
    }

    await ctx.db.patch(branch._id, { bbalance: branch.bbalance + delta });

    // 5. Insert history record
    // Use document ID as hid to avoid counter contention
    const historyId = await ctx.db.insert("history", {
      tid,
      bid,
      aid,
      delta,
      mtime: Date.now(),
      filler: "".padEnd(22, " "),
      accountId: account._id,
      tellerId: teller._id,
      branchId: branch._id,
    });

    // Update hid to use the document's own ID
    // await ctx.db.patch(historyId, { hid: historyId });

    // Return account balance (per TPC-B spec)
    return { abalance: newAbalance };
  },
});

// =============================================================================
// CLEANUP FUNCTIONS
// =============================================================================

/**
 * Clear all benchmark data
 * Use in teardown to reset the database
 */
export const clearAllData = mutation({
  args: {},
  handler: async (ctx) => {
    // Delete in order to respect "foreign key" logic (history first, then accounts, etc.)
    
    // Clear history
    const history = await ctx.db.query("history").collect();
    for (const h of history) {
      await ctx.db.delete(h._id);
    }

    // Clear accounts
    const accounts = await ctx.db.query("accounts").collect();
    for (const a of accounts) {
      await ctx.db.delete(a._id);
    }

    // Clear tellers
    const tellers = await ctx.db.query("tellers").collect();
    for (const t of tellers) {
      await ctx.db.delete(t._id);
    }

    // Clear branches
    const branches = await ctx.db.query("branches").collect();
    for (const b of branches) {
      await ctx.db.delete(b._id);
    }

    // Clear counters
    const counters = await ctx.db.query("counters").collect();
    for (const c of counters) {
      await ctx.db.delete(c._id);
    }

    return {
      deleted: {
        history: history.length,
        accounts: accounts.length,
        tellers: tellers.length,
        branches: branches.length,
        counters: counters.length,
      },
    };
  },
});

/**
 * Clear data in batches (for large datasets)
 * Convex has limits on how many documents can be deleted in one mutation
 */
export const clearTableBatch = mutation({
  args: {
    table: v.union(
      v.literal("history"),
      v.literal("accounts"),
      v.literal("tellers"),
      v.literal("branches"),
      v.literal("counters")
    ),
    limit: v.number(),
  },
  handler: async (ctx, { table, limit }) => {
    let deleted = 0;

    if (table === "history") {
      const docs = await ctx.db.query("history").take(limit);
      for (const doc of docs) {
        await ctx.db.delete(doc._id);
        deleted++;
      }
    } else if (table === "accounts") {
      const docs = await ctx.db.query("accounts").take(limit);
      for (const doc of docs) {
        await ctx.db.delete(doc._id);
        deleted++;
      }
    } else if (table === "tellers") {
      const docs = await ctx.db.query("tellers").take(limit);
      for (const doc of docs) {
        await ctx.db.delete(doc._id);
        deleted++;
      }
    } else if (table === "branches") {
      const docs = await ctx.db.query("branches").take(limit);
      for (const doc of docs) {
        await ctx.db.delete(doc._id);
        deleted++;
      }
    } else if (table === "counters") {
      const docs = await ctx.db.query("counters").take(limit);
      for (const doc of docs) {
        await ctx.db.delete(doc._id);
        deleted++;
      }
    }

    return { deleted, table };
  },
});

// =============================================================================
// UTILITY QUERIES
// =============================================================================

/**
 * Get current table counts (useful for verification)
 */
export const getTableCounts = query({
  args: {},
  handler: async (ctx) => {
    const branches = await ctx.db.query("branches").collect();
    const tellers = await ctx.db.query("tellers").collect();
    const accounts = await ctx.db.query("accounts").collect();
    const history = await ctx.db.query("history").collect();

    return {
      branches: branches.length,
      tellers: tellers.length,
      accounts: accounts.length,
      history: history.length,
    };
  },
});

/**
 * Get total balances (for verification)
 */
export const getTotalBalances = query({
  args: {},
  handler: async (ctx) => {
    const branches = await ctx.db.query("branches").collect();
    const tellers = await ctx.db.query("tellers").collect();
    const accounts = await ctx.db.query("accounts").collect();

    return {
      branchTotal: branches.reduce((sum, b) => sum + b.bbalance, 0),
      tellerTotal: tellers.reduce((sum, t) => sum + t.tbalance, 0),
      accountTotal: accounts.reduce((sum, a) => sum + a.abalance, 0),
    };
  },
});