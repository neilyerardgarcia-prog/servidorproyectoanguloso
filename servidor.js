import express from 'express';
import cors from 'cors';
import admin from 'firebase-admin';
import axios from 'axios';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import serviceAccount from './neilgarcia-e002a-firebase-adminsdk-fbsvc-1bdf5918d6.json' with { type: 'json' };

dotenv.config();

const app = express();

app.use(
  cors({
    origin: 'http://localhost:4200',
  })
);

app.use(express.json());

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

function generarContrasenya(length = 10) {
  return crypto.randomBytes(length).toString('hex').slice(0, length);
}

function enviarCorreuReset(email, novaContrasenya) {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'Restablecimiento de contraseña Botiga Virtual',
    html: `<p>Hola. Tu nueva contraseña es: <strong>${novaContrasenya}</strong></p>`,
  };

  transporter.sendMail(mailOptions, (err, info) => {
    if (err) {
      console.error('Error enviando correo:', err);
      return;
    }

    console.log('Correo enviado:', info.response);
  });
}

async function resetPasswordHandler(req, res) {
  const { nombre, email } = req.body;

  if (!email) {
    return res.status(400).json({ msg: 'Email obligatorio' });
  }

  try {
    const snapshot = await db.collection('usuaris').where('corr', '==', email).limit(1).get();

    if (snapshot.empty) {
      return res.status(404).json({ msg: 'Usuario no encontrado' });
    }

    const userDoc = snapshot.docs[0];
    const userData = userDoc.data();

    if (nombre && userData.nom !== nombre) {
      return res.status(404).json({ msg: 'Usuario no encontrado' });
    }

    const novaContrasenya = generarContrasenya(10);
    const hashedPassword = await bcrypt.hash(novaContrasenya, 10);

    await userDoc.ref.update({ contra: hashedPassword });
    enviarCorreuReset(email, novaContrasenya);

    return res.json({ msg: 'Nueva contraseña enviada al correo' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ msg: 'Error del servidor' });
  }
}

app.listen(3080, () => {
  console.log('Servidor Firebase en http://localhost:3080');
});

app.get('/', (req, res) => {
  res.send('Servidor OK');
});

app.post('/usuaris', async (req, res) => {
  console.log('BODY:', req.body);

  const { nom, contra, corr } = req.body;

  if (!nom || !contra || !corr) {
    return res.status(400).json({ error: 'Faltan datos' });
  }

  try {
    const snapshot = await db.collection('usuaris').where('corr', '==', corr).get();

    if (!snapshot.empty) {
      return res.status(400).json({ error: 'Email ya existe' });
    }

    const hashedPassword = await bcrypt.hash(contra, 10);

    const ref = await db.collection('usuaris').add({
      nom,
      contra: hashedPassword,
      corr,
      role: 'user',
    });

    console.log('Firebase creado:', ref.id);

    let mysqlUser = null;

    try {
      const response = await axios.post('http://localhost:3000/usuarios', {
        firebase_uid: ref.id,
        username: nom,
        email: corr,
        password: hashedPassword,
      });

      console.log('MYSQL OK:', response.data);
      mysqlUser = response.data;
    } catch (mysqlError) {
      console.error('MYSQL ERROR:');
      console.error(mysqlError.response?.data || mysqlError.message);
    }

    return res.json({
      firebaseId: ref.id,
      usuarioId: mysqlUser?.id || null,
      role: 'user',
    });
  } catch (error) {
    console.error('ERROR GENERAL:', error);
    return res.status(500).json({ error: error.message });
  }
});

app.post('/login', async (req, res) => {
  const { nom, contra } = req.body;

  try {
    const snapshot = await db.collection('usuaris').where('nom', '==', nom).limit(1).get();

    if (snapshot.empty) {
      return res.status(401).json({ error: 'Usuario no existe' });
    }

    const userDoc = snapshot.docs[0];
    const userData = userDoc.data();
    const passwordGuardada = userData.contra || '';
    const passwordOk =
      passwordGuardada === contra ||
      (passwordGuardada.startsWith('$2') && (await bcrypt.compare(contra, passwordGuardada)));

    if (!passwordOk) {
      return res.status(401).json({ error: 'Contraseña incorrecta' });
    }

    let usuarioId = null;
    let mysqlRole = '';

    try {
      const response = await axios.get(`http://localhost:3000/usuarios/firebase/${userDoc.id}`);
      usuarioId = response.data.id;
      mysqlRole = response.data.rol || response.data.role || '';
    } catch (err) {
      console.error('ERROR buscando en MySQL');
    }

    return res.json({
      firebaseId: userDoc.id,
      usuarioId,
      ...userData,
      role: userData.role || mysqlRole || 'user',
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message });
  }
});

app.post('/api/reset-password', resetPasswordHandler);
app.post('/reset-password', resetPasswordHandler);
