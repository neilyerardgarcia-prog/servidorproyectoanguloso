import express from 'express';
import cors from 'cors';
import nodemailer from 'nodemailer';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import admin from 'firebase-admin';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

const app = express();
app.use(cors({ origin: 'http://localhost:4200' }));
app.use(express.json());

// Carregar serviceAccount JSON sense assert
const serviceAccountPath = path.resolve('./neilgarcia-e002a-firebase-adminsdk-fbsvc-1bdf5918d6.json');
const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

// Firebase
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://neilgarcia-e002a-default-rtdb.europe-west1.firebasedatabase.app"
});
const db = admin.firestore();

// Nodemailer
const transporter = nodemailer.createTransport({
    service: 'gmail', // o el teu servei
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// Funció per generar contrasenya nova
function generarContrasenya(length = 10) {
    return crypto.randomBytes(length).toString('hex').slice(0, length);
}

// Funció per enviar correu amb la nova contrasenya
function enviarCorreuReset(email, novaContrasenya) {
    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: 'Restablecimiento de contraseña Botiga Virtual',
        html: `<p>Hola! Tu nueva contraseña es: <strong>${novaContrasenya}</strong></p>`
    };

    transporter.sendMail(mailOptions, (err, info) => {
        if (err) console.error(err);
        else console.log('Correo enviado: ' + info.response);
    });
}

// Endpoint per restablir contrasenya
app.post('/reset-password', async (req, res) => {
    const { email } = req.body;

    try {
        const userRef = db.collection('usuaris').doc(email);
        const userDoc = await userRef.get();

        if (!userDoc.exists) {
            return res.status(404).json({ msg: 'Usuario no encontrado' });
        }

        const novaContrasenya = generarContrasenya(10);
        const hashedPassword = await bcrypt.hash(novaContrasenya, 10);

        await userRef.update({ contra: hashedPassword });

        enviarCorreuReset(email, novaContrasenya);

        res.json({ msg: 'Nueva contraseña enviada al correo' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ msg: 'Error del servidor' });
    }
});

// Arrancar servidor
const PORT = 3090;
app.listen(PORT, () => console.log(`Servidor de contraseñas escuchando en http://localhost:${PORT}`));