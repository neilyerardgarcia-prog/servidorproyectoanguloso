//npm install express firebase-admin cors

import  express from 'express';
import cors from 'cors';
import admin from 'firebase-admin';
import serviceAccount from './neilgarcia-e002a-firebase-adminsdk-fbsvc-1bdf5918d6.json' with { type: 'json' };

const app = express();

app.use(cors({
    origin: 'http://localhost:4200'
}));
app.use(express.json());

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://neilgarcia-e002a-default-rtdb.europe-west1.firebasedatabase.app"
});
const port = 3020;
app.listen(port,() => {
    console.log(`Servidor escuchando en http://localhost:${port}`);
});

const db = admin.firestore();
app.get('/exaca', async (req,res) => {
    try {
        const snapshot = await db.collection('exaca').get();
        const usuaris = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        res.json(usuaris);
        console.log(usuaris)

    }catch (error){
        console.error(error);
        res.status(500).json({ error: "Error al obtener los datos" });
    }
});
app.get('/exaca/213', async (req, res)=>{
    const snapshot = await db.collection('exaca').doc('213').get();
    const campo = snapshot.data().nom;
    res.json({nom: campo})

})
// pruebas //

app.get('/example',(req, res) =>{
    const prueba ={
        id:1,
        nombre:2
    }
    res.json(prueba)
})

// get firebase //

app.get('/exaca', async (req, res)=>{
    try {
        const cosa = await db.collection('popo').doc('popo').get();
        res.json(cosa)
    }catch (error){
        console.log(error)
    }
});

app.get('exaca', async (req, res) => {
    try {
        const cosa = await  db.collection('exaca').get();
        const guardar = [];

        cosa.forEach(nombrearray =>{
            guardar.push({
                id: nombrearray.id,
                ... nombrearray.data()
            })
        })

        res.status(200).json(guardar)
    } catch (error){
        console.log(error)
    }
})
// post firebase //

app.post('/exaca', async (req, res) =>{
    const {nom, id} = req.body;
    const ref = db.collection('exaca').doc(id);
    const doc = await ref.get();
    if (doc.exists) {
        return res.status(400).send('El usuario ya existe');
    }
    await ref.set({
        id: id,
        nom: nom,
        jedi: true
    })
    res.status(200).json({mensaje: 'user creado'});
});

// put en firebas //

app.put('exaca/:id', async (req, res)=>{
    const { id } = req.params;
    const { jedi } = req.body;
    const ref = db.collection('exaca').doc(id);
    const doc = await ref.get();
    if (!doc){
        return res.status(404).send("no existe")
    }
    await ref.update({ jedi })
    res.status(200).json({mensaje: "usuario modificado"})
})

app.get('/chiste', async (req, res) => {
    const respuesta = await fetch('https://jokeapi.adamxu.net/');
    const data = await respuesta.json();
    console.log(data["a"]);
    console.log(data.q);

    res.json(data);
});

app.delete('/exaca/:id', async (req, res) => {
    try {
        const id = req.params.id;
        await db.collection('exaca').doc(id).delete();
        res.json({ message: "Documento eliminado", id: id });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error al eliminar" });
    }
});