import express from 'express'
import cors from 'cors';
import 'dotenv/config';

const app = express();
const PORT = process.env.PORT || 5000;

//Middleware
app.use(cors());
app.use(express.json());

app.get('/',(req,res)=>{
  res.send('server is live');
});

app.listen(PORT,()=>{
  console.log(`server is running at http://localhost:${PORT}`)
});