import express from 'express';
import { createServer as createViteServer } from 'vite';
import cors from 'cors';
import * as admin from 'firebase-admin';
import path from 'path';

// AI Studio default configuration usually supplies application default credentials
try {
  admin.initializeApp();
} catch (error) {
  console.log('Firebase admin initialization skipped or failed:', error);
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  const db = admin.firestore();

  // Middleware to authenticate API keys
  const authenticateApiKey = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const apiKey = req.header('X-API-Key') || req.query.apiKey;
    
    if (!apiKey || typeof apiKey !== 'string') {
      return res.status(401).json({ error: 'Missing or invalid API Key' });
    }

    try {
      // Find the API key in Firestore
      const apiKeysRef = db.collection('apiKeys');
      const snapshot = await apiKeysRef.where('key', '==', apiKey).limit(1).get();
      
      if (snapshot.empty) {
        return res.status(401).json({ error: 'Invalid API Key' });
      }
      
      const keyDoc = snapshot.docs[0];
      const keyData = keyDoc.data();
      
      if (keyData.disabled) {
        return res.status(403).json({ error: 'API Key is disabled' });
      }
      
      if (keyData.expiresAt && Date.now() > keyData.expiresAt) {
        return res.status(403).json({ error: 'API Key has expired' });
      }
      
      if (keyData.limit > 0 && keyData.used >= keyData.limit) {
        return res.status(429).json({ error: 'API Key usage limit exceeded' });
      }
      
      // Increment usage count
      await keyDoc.ref.update({
        used: admin.firestore.FieldValue.increment(1)
      });
      
      next();
    } catch (error) {
      console.error('API Auth Error:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  };

  // API Routes
  app.get('/api/v1/results', authenticateApiKey, async (req, res) => {
    try {
      const resultsRef = db.collection('results');
      const snapshot = await resultsRef.get();
      const results = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      res.json({ results });
    } catch (error) {
       console.error(error);
       res.status(500).json({ error: 'Failed to fetch results' });
    }
  });

  app.get('/api/v1/results/:rollNumber', authenticateApiKey, async (req, res) => {
    try {
      const rollNumber = req.params.rollNumber;
      const resultsRef = db.collection('results');
      const snapshot = await resultsRef.where('rollNumber', '==', rollNumber).limit(1).get();
      
      if (snapshot.empty) {
         return res.status(404).json({ error: 'Result not found' });
      }
      
      const doc = snapshot.docs[0];
      res.json({ id: doc.id, ...doc.data() });
    } catch (error) {
       console.error(error);
       res.status(500).json({ error: 'Failed to fetch result' });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
