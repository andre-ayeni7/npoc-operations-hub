/**
 * NPOC Database System
 * IndexedDB-based state management with unlimited storage, transactions, and performance
 * Replaces localStorage completely
 * 
 * @author NPOC Engineering
 * @version 2.0
 */

class NPOCDatabase {
  constructor(dbName = 'NPOC_V2', version = 1) {
    this.dbName = dbName;
    this.version = version;
    this.db = null;
    this.stores = [
      'admins', 'calls', 'attendance', 'tasks', 'faculty',
      'email_templates', 'email_queue', 'admin_attendance',
      'audit', 'sessions', 'settings', 'app_state'
    ];
    this.isReady = false;
  }

  /**
   * Initialize database and create object stores
   */
  async init() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(this.dbName, this.version);

      req.onerror = () => {
        console.error('[DB] Open failed:', req.error);
        reject(req.error);
      };

      req.onupgradeneeded = (event) => {
        const db = event.target.result;

        this.stores.forEach(storeName => {
          if (!db.objectStoreNames.contains(storeName)) {
            const store = db.createObjectStore(storeName, { keyPath: 'id' });

            // Create indexes for common queries
            if (storeName === 'calls') {
              store.createIndex('phone', 'phone', { unique: false });
              store.createIndex('status', 'status', { unique: false });
              store.createIndex('adminName', 'adminName', { unique: false });
              store.createIndex('updated', 'updated', { unique: false });
            }
            if (storeName === 'attendance') {
              store.createIndex('phone', 'phone', { unique: false });
              store.createIndex('module', 'module', { unique: false });
              store.createIndex('date', 'date', { unique: false });
            }
            if (storeName === 'tasks') {
              store.createIndex('adminName', 'adminName', { unique: false });
              store.createIndex('status', 'status', { unique: false });
              store.createIndex('dueDate', 'dueDate', { unique: false });
            }
            if (storeName === 'audit') {
              store.createIndex('timestamp', 'timestamp', { unique: false });
              store.createIndex('adminEmail', 'adminEmail', { unique: false });
            }
          }
        });

        console.log('[DB] Object stores created');
      };

      req.onsuccess = () => {
        this.db = req.result;
        this.isReady = true;
        console.log('[DB] Database initialized');
        resolve(this.db);
      };
    });
  }

  /**
   * Get single record by ID
   */
  async get(storeName, id) {
    if (!this.isReady) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const tx = this.db.transaction([storeName], 'readonly');
      const store = tx.objectStore(storeName);
      const req = store.get(id);

      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  }

  /**
   * Get all records from store
   */
  async getAll(storeName) {
    if (!this.isReady) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const tx = this.db.transaction([storeName], 'readonly');
      const store = tx.objectStore(storeName);
      const req = store.getAll();

      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  }

  /**
   * Get records by index
   */
  async getAllByIndex(storeName, indexName, value) {
    if (!this.isReady) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const tx = this.db.transaction([storeName], 'readonly');
      const store = tx.objectStore(storeName);
      const index = store.index(indexName);
      const req = index.getAll(value);

      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  }

  /**
   * Query with filter function
   */
  async query(storeName, filterFn) {
    const all = await this.getAll(storeName);
    return all.filter(filterFn);
  }

  /**
   * Add or update record
   */
  async put(storeName, record) {
    if (!this.isReady) throw new Error('Database not initialized');
    if (!record.id) throw new Error(`Record missing id: ${storeName}`);

    return new Promise((resolve, reject) => {
      const tx = this.db.transaction([storeName], 'readwrite');
      const store = tx.objectStore(storeName);

      const data = {
        ...record,
        _updated: new Date().toISOString()
      };

      const req = store.put(data);

      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);

      tx.onerror = () => reject(tx.error);
    });
  }

  /**
   * Delete record
   */
  async delete(storeName, id) {
    if (!this.isReady) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const tx = this.db.transaction([storeName], 'readwrite');
      const store = tx.objectStore(storeName);
      const req = store.delete(id);

      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  /**
   * Clear all records from store
   */
  async clear(storeName) {
    if (!this.isReady) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const tx = this.db.transaction([storeName], 'readwrite');
      const store = tx.objectStore(storeName);
      const req = store.clear();

      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  /**
   * Batch operation (all or nothing)
   */
  async batch(operations) {
    if (!this.isReady) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const stores = [...new Set(operations.map(op => op.store))];
      const tx = this.db.transaction(stores, 'readwrite');

      const results = [];
      let completed = 0;

      operations.forEach((op, index) => {
        const store = tx.objectStore(op.store);
        let req;

        if (op.type === 'put') {
          req = store.put({ ...op.data, _updated: new Date().toISOString() });
        } else if (op.type === 'delete') {
          req = store.delete(op.key);
        } else {
          reject(new Error(`Unknown operation: ${op.type}`));
          return;
        }

        req.onsuccess = () => {
          results[index] = req.result;
          completed++;
          if (completed === operations.length) {
            resolve(results);
          }
        };

        req.onerror = () => reject(req.error);
      });

      tx.onerror = () => reject(tx.error);
      tx.oncomplete = () => console.log('[DB] Batch transaction completed');
    });
  }

  /**
   * Get database statistics
   */
  async getStats() {
    const stats = {};

    for (const storeName of this.stores) {
      const records = await this.getAll(storeName);
      stats[storeName] = {
        count: records.length,
        estimatedBytes: JSON.stringify(records).length
      };
    }

    const totalBytes = Object.values(stats).reduce((sum, s) => sum + s.estimatedBytes, 0);

    return {
      stores: stats,
      totalRecords: Object.values(stats).reduce((sum, s) => sum + s.count, 0),
      totalBytes,
      totalMB: (totalBytes / 1024 / 1024).toFixed(2),
      isReady: this.isReady
    };
  }

  /**
   * Export entire database as JSON
   */
  async exportJSON() {
    const backup = {};

    for (const storeName of this.stores) {
      backup[storeName] = await this.getAll(storeName);
    }

    return JSON.stringify(backup, null, 2);
  }

  /**
   * Import JSON backup
   */
  async importJSON(jsonString) {
    try {
      const backup = JSON.parse(jsonString);

      for (const [storeName, records] of Object.entries(backup)) {
        if (!this.stores.includes(storeName)) continue;

        await this.clear(storeName);
        for (const record of records) {
          await this.put(storeName, record);
        }
      }

      console.log('[DB] Import completed successfully');
      return { success: true };
    } catch (error) {
      console.error('[DB] Import failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Close database connection
   */
  close() {
    if (this.db) {
      this.db.close();
      this.isReady = false;
    }
  }
}

// Global instance
const NPOC_DB = new NPOCDatabase();
