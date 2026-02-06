import fs from "fs/promises";
import os from "os";
import path from "path";

export interface TokenData {
  accessToken: string;
  expiresAt: number; // Unix timestamp in seconds
  refreshToken?: string;
}

export class TokenStore {
  private static getFilePath(): string {
    const homeDir = os.homedir();
    return path.join(homeDir, ".smartbear", "tokens.json");
  }

  private static async ensureDir(): Promise<void> {
    const filePath = TokenStore.getFilePath();
    const dir = path.dirname(filePath);
    await fs.mkdir(dir, { recursive: true });
  }

  static async save(service: string, data: TokenData): Promise<void> {
    await TokenStore.ensureDir();
    const filePath = TokenStore.getFilePath();
    let tokens: Record<string, TokenData> = {};

    try {
      const content = await fs.readFile(filePath, "utf-8");
      tokens = JSON.parse(content);
    } catch (error) {
      // Ignore error if file doesn't exist or is invalid
    }

    tokens[service] = data;
    await fs.writeFile(filePath, JSON.stringify(tokens, null, 2), {
      mode: 0o600, // Secure permissions
    });
  }

  static async load(service: string): Promise<TokenData | null> {
    const filePath = TokenStore.getFilePath();
    try {
      const content = await fs.readFile(filePath, "utf-8");
      const tokens = JSON.parse(content);
      return tokens[service] || null;
    } catch (error) {
      return null;
    }
  }

  static async clear(service: string): Promise<void> {
    const filePath = TokenStore.getFilePath();
    try {
      const content = await fs.readFile(filePath, "utf-8");
      const tokens = JSON.parse(content);
      if (tokens[service]) {
        delete tokens[service];
        await fs.writeFile(filePath, JSON.stringify(tokens, null, 2), {
          mode: 0o600,
        });
      }
    } catch (error) {
      // Ignore error
    }
  }
}
