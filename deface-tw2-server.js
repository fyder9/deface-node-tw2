const express = require('express');
const config = require('./config');
//const cron = require('node-cron');
const path = require('path');
const multer = require('multer');
const { spawn } = require('child_process');
const app = express();
//////
const uploadFolder = path.join(__dirname, 'uploads');
const outputFolder = path.join(__dirname, 'outputs');
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadFolder),
    filename: (req, file, cb) => {
        const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
        cb(null, unique + ".mp4");
    }
});
const upload = multer({ storage: storage });
//////
app.use(express.static('public'));
app.use(express.json());
app.use("/outputs", express.static(path.join(__dirname, "outputs")));
//////
app.get('/', (req, res) => { //serve homepage
    res.sendFile(__dirname + '/public/home-tw2-deface.html');
});
app.post('/upload', upload.single('video'), (req, res) => { //file upload endpoint
    if (!req.file) {
        return res.status(400).send('No file uploaded.');
    }
    const inputPath = req.file.path;
    const outputName = 'defaced-' + req.file.filename;
    const outputPath = path.join(outputFolder, outputName);
    const pythonPath = config.pythonPath
    const args = ["deface", inputPath, "-o", outputPath, "--backend", "onnxrt", "--execution-provider", "DmlExecutionProvider"];
    const childProcess = spawn(config.pythonPath, args);


    childProcess.stdout.on("data", data => {
        console.log("DEFACE:", data.toString());
    });

    childProcess.stderr.on("data", data => {
        console.error("DEFACE ERROR:", data.toString());
    });

    childProcess.on("close", code => {
        if (code === 0) {
            console.log("Deface terminato con successo.");

            return res.send(`
            <h2>Video anonimizzato</h2>
            <a href="/outputs/${outputName}" download>Scarica il video blur-ato</a>
          `);
        } else {
            return res.status(500).send("Errore durante l'anonimizzazione.");
        }
    });
});

//////
app.listen(3100, () => { //start server
    console.log('Server is running on port 3100');
    console.log("http://localhost:3100");
});
