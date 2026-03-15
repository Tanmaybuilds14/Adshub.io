import express from 'express'

const app = express();
const PORT = 3000;

app.get('/',(req,res)=>{
  res.send('server is live');
});

app.listen(PORT,()=>{
  console.log(`server is running at http://localhost:${PORT}`)
})