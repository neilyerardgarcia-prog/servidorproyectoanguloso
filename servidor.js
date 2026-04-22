import express from 'express';
import cors from 'cors';
import admin from 'firebase-admin';
import axios from 'axios';
import serviceAccount from './neilgarcia-e002a-firebase-adminsdk-fbsvc-1bdf5918d6.json' with { type: 'json' };

const app = express();

app.use(cors({
    origin: 'http://localhost:4200'
}));

app.use(express.json());

// 🔹 Firebase
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

app.listen(3080, () => {
    console.log('🔥 Servidor Firebase en http://localhost:3080');
});

// 🔹 TEST para ver si se cae
app.get('/', (req, res) => {
    res.send('Servidor OK');
});

app.post('/usuaris', async (req, res) => {
    console.log("📥 BODY:", req.body);

    const { nom, contra, corr } = req.body;

    if (!nom || !contra || !corr) {
        return res.status(400).json({ error: 'Faltan datos' });
    }

    try {
        const snapshot = await db.collection('usuaris')
            .where('corr', '==', corr)
            .get();

        if (!snapshot.empty) {
            return res.status(400).json({ error: 'Email ya existe' });
        }

        const ref = await db.collection('usuaris').add({
            nom,
            contra,
            corr
        });

        console.log("✅ Firebase creado:", ref.id);

        let mysqlUser = null;

        try {
            const response = await axios.post('http://localhost:3000/usuarios', {
                firebase_uid: ref.id,
                username: nom,
                email: corr,
                password: contra // 🔥 SOLUCIÓN
            });

            console.log("✅ MYSQL OK:", response.data);

            mysqlUser = response.data;

        } catch (mysqlError) {
            console.error("❌ MYSQL ERROR:");
            console.error(mysqlError.response?.data || mysqlError.message);
        }

        res.json({
            firebaseId: ref.id,
            usuarioId: mysqlUser?.id || null
        });

    } catch (error) {
        console.error("💥 ERROR GENERAL:", error);
        res.status(500).json({ error: error.message });
    }
});

// 🔹 LOGIN
app.post('/login', async (req, res) => {
    const { nom, contra } = req.body;

    try {
        const snapshot = await db.collection('usuaris')
            .where('nom', '==', nom)
            .get();

        if (snapshot.empty) {
            return res.status(401).json({ error: 'Usuario no existe' });
        }

        const userDoc = snapshot.docs[0];
        const userData = userDoc.data();

        if (userData.contra !== contra) {
            return res.status(401).json({ error: 'Contraseña incorrecta' });
        }

        // 🔥 BUSCAR ID MYSQL
        let usuarioId = null;

        try {
            const response = await axios.get(
                `http://localhost:3000/usuarios/firebase/${userDoc.id}`
            );
            usuarioId = response.data.id;
        } catch (err) {
            console.error("❌ ERROR buscando en MySQL");
        }

        res.json({
            firebaseId: userDoc.id,
            usuarioId,
            ...userData
        });
        console.log("🔥 Firebase ID:", userDoc.id);


    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});
