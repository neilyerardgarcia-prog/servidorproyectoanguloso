import  express from 'express';
import cors from 'cors';
import admin from 'firebase-admin';

const app = express();

app.use(cors({
    origin: 'http://localhost:4200'
}));
app.use(express.json());

const port = 3080;
app.listen(port,() => {
    console.log(`Servidor escuchando en http://localhost:${port}`);
});

//INICI

const db = admin.firestore();

app.get('/bussines', async (req, res) => {
    try {
        const docRef = db.collection('usuaris').doc('tupapa');
        const doc = await docRef.get();

        if (!doc.exists) {
            return res.status(404).json({ mensaje: 'No existe' });
        }

        res.json(doc.data());
        console.log(docRef)

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});



//es para agregar usuarios al firebase


app.post('/usuaris', async (req, res) => {

    const { nom, contra, corr } = req.body;

    const ref = db.collection('usuaris').doc(nom);
    const doc = await ref.get();

    if (doc.exists) {
        return res.status(400).send('El usuario ya existe');
    }

    await ref.set({
        nom: nom,
        contra: contra,
        corr: corr
    });

    res.status(200).json({ mensaje: 'Usuario creado correctamente' });
});

app.put('/usuaris/:id', async (req, res) => {
    const { id } = req.params;
    const { nom } = req.body;

    const oldRef = db.collection('usuaris').doc(id);
    const doc = await oldRef.get();

    if (!doc.exists) {
        return res.status(404).send("No existe");
    }

    await db.collection('usuaris').doc(nom).set(doc.data());
    await oldRef.delete();

    res.send("Cambiado");
});

//mostrar usuarios

app.get('/usuaris', async (req, res) => {
    try {
        const snapshot = await db.collection('usuaris').get();

        if (snapshot.empty) {
            return res.status(404).json({ mensaje: 'No hay usuarios' });
        }

        const usuaris = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        res.json(usuaris);

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
