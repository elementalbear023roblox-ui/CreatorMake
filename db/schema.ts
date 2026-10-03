import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const robloxPairingSessions=sqliteTable("roblox_pairing_sessions",{
  id:text("id").primaryKey(),
  pairingCode:text("pairing_code").notNull(),
  projectId:text("project_id").notNull(),
  projectName:text("project_name").notNull(),
  screenGuiName:text("screen_gui_name").notNull(),
  status:text("status",{enum:["pending","connected","disconnected","expired"]}).notNull(),
  mode:text("mode",{enum:["manual","live"]}).notNull().default("manual"),
  publisherTokenHash:text("publisher_token_hash").notNull(),
  studioTokenHash:text("studio_token_hash"),
  pluginInstanceId:text("plugin_instance_id"),
  expiresAt:integer("expires_at").notNull(),
  createdAt:integer("created_at").notNull(),
  connectedAt:integer("connected_at"),
  lastSeenAt:integer("last_seen_at"),
  revision:integer("revision").notNull().default(0),
  appliedRevision:integer("applied_revision").notNull().default(0),
  manifestJson:text("manifest_json"),
  operationsJson:text("operations_json").notNull().default("[]"),
},(table)=>[
  uniqueIndex("idx_roblox_pairing_sessions_code").on(table.pairingCode),
  index("idx_roblox_pairing_sessions_status_expiry").on(table.status,table.expiresAt),
]);
