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

app.get('/guason',(req, res) => {
    const guason = {algo: "texto", numero: 21}
    res.json(guason)
});

//INICI

const db = admin.firestore();
const bussines = db.collection('usuaris').doc('tupapa')
const doc = await bussines.get();

if (!doc.exists) {
    console.log('no such document ');
}else {
    console.log('documento ', doc.data().usuari);
}

app.get('/bussines', async (req, res) => {
    if (!doc.exists) {
        return res.status(404).json({ mensaje: 'No existe' });
    }
    res.json(doc.data());
});

app.get('/usuari', async (req, res) => {
    if (!doc.exists) {
        return res.status(404).json({ mensaje: 'No existe' });
    }
    res.json(doc.data());
});


app.post('/usuaris', async (req, res) => {

    const { usuari, contra } = req.body;

    const nuevoPersona = {
        nom: usuari,
        contra: contra
    };

    await db.collection('usuaris').add(nuevoPersona);

    res.send('OK');
});

app.put('/usuaris/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { nom, contra } = req.body;

        const ref = db.collection('usuaris').doc(id);
        const doc = await ref.get();

        if (!doc.exists) {
            return res.status(404).json({ mensaje: 'No existe el personaje' });
        }
        await ref.update({
            nom,
            contra
        });
        res.json({ mensaje: 'Personaje actualizado correctamente' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


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




