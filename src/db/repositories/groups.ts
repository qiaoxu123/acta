import { select, execute } from "../client";
import { newId } from "../../lib/ids";

export interface Group {
  id: string;
  name: string;
  description: string | null;
  created_by: string;
  created_at: string;
}

export interface GroupMember {
  group_id: string;
  user_id: string;
  role: string;
  joined_at: string;
}

export async function listGroups(): Promise<Group[]> {
  return select<Group>("SELECT * FROM groups ORDER BY name ASC");
}

export async function listMyGroups(userId: string): Promise<Group[]> {
  return select<Group>(
    `SELECT g.* FROM groups g JOIN group_members gm ON gm.group_id = g.id WHERE gm.user_id = $1 ORDER BY g.name`,
    [userId],
  );
}

export async function listMembers(groupId: string): Promise<GroupMember[]> {
  return select<GroupMember>("SELECT * FROM group_members WHERE group_id = $1", [groupId]);
}

export async function createGroup(name: string, createdBy: string, description?: string): Promise<string> {
  const id = newId();
  const ts = new Date().toISOString();
  await execute(
    "INSERT INTO groups(id, name, description, created_by, created_at) VALUES($1,$2,$3,$4,$5)",
    [id, name.trim(), description?.trim() || null, createdBy, ts],
  );
  // Creator is auto-added as owner
  await execute(
    "INSERT INTO group_members(group_id, user_id, role, joined_at) VALUES($1,$2,'owner',$3)",
    [id, createdBy, ts],
  );
  return id;
}

export async function addMember(groupId: string, userId: string): Promise<void> {
  await execute(
    "INSERT OR IGNORE INTO group_members(group_id, user_id, role, joined_at) VALUES($1,$2,'member',$3)",
    [groupId, userId, new Date().toISOString()],
  );
}

export async function removeMember(groupId: string, userId: string): Promise<void> {
  await execute("DELETE FROM group_members WHERE group_id = $1 AND user_id = $2", [groupId, userId]);
}

export async function shareItem(groupId: string, tableName: string, itemId: string, sharedBy: string): Promise<void> {
  await execute(
    "INSERT OR IGNORE INTO shared_items(group_id, table_name, item_id, shared_by, shared_at) VALUES($1,$2,$3,$4,$5)",
    [groupId, tableName, itemId, sharedBy, new Date().toISOString()],
  );
}

export async function unshareItem(groupId: string, tableName: string, itemId: string): Promise<void> {
  await execute("DELETE FROM shared_items WHERE group_id=$1 AND table_name=$2 AND item_id=$3", [groupId, tableName, itemId]);
}

export async function listSharedItems(groupId: string, tableName: string): Promise<string[]> {
  const rows = await select<{ item_id: string }>(
    "SELECT item_id FROM shared_items WHERE group_id = $1 AND table_name = $2",
    [groupId, tableName],
  );
  return rows.map((r) => r.item_id);
}
