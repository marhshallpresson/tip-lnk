import { randomUUID } from 'crypto';

/**
 * Mock Database Implementation
 * Bypasses native sqlite3 dependency issues on Windows/Node 24
 */

class MockTable {
  private data: any[] = [];
  private tableName: string;

  constructor(tableName: string) {
    this.tableName = tableName;
  }

  where(query: any) {
    return {
      first: async () => {
        return this.data.find(item => {
          for (const key in query) {
            if (item[key] !== query[key]) return false;
          }
          return true;
        }) || null;
      },
      delete: async () => {
        const initialLength = this.data.length;
        this.data = this.data.filter(item => {
          for (const key in query) {
            if (item[key] !== query[key]) return false;
          }
          return true;
        });
        return initialLength - this.data.length;
      },
      update: async (partial: any) => {
        let count = 0;
        this.data.forEach(item => {
          let matches = true;
          for (const key in query) {
            if (item[key] !== query[key]) matches = false;
          }
          if (matches) {
            Object.assign(item, partial, { updatedAt: new Date() });
            count++;
          }
        });
        return count;
      },
      select: async () => {
        return this.data.filter(item => {
          for (const key in query) {
            if (item[key] !== query[key]) return false;
          }
          return true;
        });
      }
    };
  }

  whereRaw(raw: string, params: any[]) {
      // Very limited support for LOWER(email) = ?
      if (raw.toLowerCase().includes('lower(email) = ?')) {
          const email = params[0].toLowerCase();
          return {
              first: async () => this.data.find(u => u.email?.toLowerCase() === email) || null
          };
      }
      return this.where({});
  }

  whereNull(col: string) {
      return {
          whereRaw: (raw: string, params: any[]) => this.whereRaw(raw, params),
          where: (query: any) => this.where(query),
          first: async () => this.data.find(item => item[col] === null) || null
      }
  }

  async insert(item: any) {
    const newItem = { ...item, createdAt: new Date(), updatedAt: new Date() };
    this.data.push(newItem);
    return [newItem];
  }

  async first() {
    return this.data[0] || null;
  }
}

class MockDb {
  private tables: Record<string, MockTable> = {};

  table(name: string) {
    if (!this.tables[name]) {
      this.tables[name] = new MockTable(name);
    }
    return this.tables[name];
  }

  // Knex-like interface
  fn = {
    now: () => new Date()
  };

  schema = {
    hasTable: async (name: string) => true,
    createTable: async (name: string, cb: any) => {
        console.log(`[MockDB] Table "${name}" created.`);
        return true;
    }
  };

  raw(query: string) {
      return {
          first: async () => null
      };
  }
}

const mockInstance = new MockDb();

// Main proxy function to handle db('table_name')
export const db: any = (tableName: string) => mockInstance.table(tableName);

// Attach schema and other properties to the proxy
db.schema = mockInstance.schema;
db.fn = mockInstance.fn;
db.raw = mockInstance.raw;

export const knex = db;
export const initSchema = async () => {
    console.log('[MockDB] Skipping real schema init, using in-memory mocks.');
    // Seed default role
    await db('roles').insert({ id: '00000000-0000-4000-8000-000000000001', name: 'user' });
};

export default db;
