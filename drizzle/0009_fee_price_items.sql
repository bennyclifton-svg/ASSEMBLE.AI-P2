-- Migration: 0009_fee_price_items
-- Description: Add Fee Structure and Price Structure tables for tender requests

-- Discipline Fee Items (Fee Structure line items for consultant tender requests)
CREATE TABLE IF NOT EXISTS discipline_fee_items (
    id TEXT PRIMARY KEY,
    discipline_id TEXT NOT NULL REFERENCES consultant_disciplines(id),
    description TEXT NOT NULL,
    sort_order INTEGER NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Trade Price Items (Price Structure line items for contractor tender requests)
CREATE TABLE IF NOT EXISTS trade_price_items (
    id TEXT PRIMARY KEY,
    trade_id TEXT NOT NULL REFERENCES contractor_trades(id),
    description TEXT NOT NULL,
    sort_order INTEGER NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_discipline_fee_items_discipline ON discipline_fee_items(discipline_id);
CREATE INDEX IF NOT EXISTS idx_trade_price_items_trade ON trade_price_items(trade_id);
