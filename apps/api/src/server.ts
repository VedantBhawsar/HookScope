import express from "express"

const startServer = () => {
  const app = express()

  app.get("/", (_, response) => {
    response.send("Hello, World!")
  })

  const PORT = process.env.PORT || 3000

  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`)
  })
}

export default startServer
