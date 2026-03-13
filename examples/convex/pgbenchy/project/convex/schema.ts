import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  branches: defineTable({
    bid: v.number(),
    bbalance: v.number(),
    filler: v.optional(v.string()),
  }).index("by_bid", ["bid"]),

  tellers: defineTable({
    tid: v.number(),
    bid: v.number(), // Store bid directly for easier lookups
    branchId: v.id("branches"),
    tbalance: v.number(),
    filler: v.optional(v.string()),
  })
    .index("by_tid", ["tid"])
    .index("by_bid", ["bid"]),

  accounts: defineTable({
    aid: v.number(),
    bid: v.number(), // Store bid directly for easier lookups
    branchId: v.id("branches"),
    abalance: v.number(),
    filler: v.optional(v.string()),
  })
    .index("by_aid", ["aid"])
    .index("by_bid", ["bid"]),

  history: defineTable({
    // hid: v.string(), // Changed from v.number() to v.string() to use Convex IDs and eliminate counter contention
    tid: v.number(),
    bid: v.number(),
    aid: v.number(),
    delta: v.number(),
    mtime: v.number(),
    filler: v.optional(v.string()),
    // Document references (optional, for joins if needed)
    accountId: v.optional(v.id("accounts")),
    tellerId: v.optional(v.id("tellers")),
    branchId: v.optional(v.id("branches")),
  })
    // .index("by_hid", ["hid"])
    .index("by_tid", ["tid"])
    .index("by_bid", ["bid"])
    .index("by_aid", ["aid"]),

  // Counter table for generating sequential IDs
  counters: defineTable({
    name: v.string(),
    value: v.number(),
  }).index("by_name", ["name"]),
});