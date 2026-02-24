import  express from 'express';
import cors from "cors";

const app = express();

app.use(cors({
    origin: 'http://localhost:4200'
}));
app.use(express.json());

const port = 3090;

app.listen(port,() => {
    console.log(`Servidor escuchando en http://localhost:${port}`);
});
app.get('/obeservado',(req, res) => {
    const observado = {algo: "texto", numero: 21}
    res.json(observado)
});
fetch('https://randomuser.me/api/')
    .then(response => response.json())
    .then(data => {
        console.log(data);
    });
