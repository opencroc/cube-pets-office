import path from 'node:path';

export const DEFAULT_MISSION_SNAPSHOT_FILENAME = 'mission-snapshots.json';

export function getMissionDataDir(): string {
  return path.resolve(process.cwd(), 'data', 'missions');
}

export function getMissionSnapshotFilePath(
  filename = DEFAULT_MISSION_SNAPSHOT_FILENAME
): string {
  return path.join(getMissionDataDir(), filename);
}
