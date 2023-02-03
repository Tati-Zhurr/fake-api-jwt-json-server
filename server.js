const fs = require('fs')
const bodyParser = require('body-parser')
const jsonServer = require('json-server')
const jwt = require('jsonwebtoken')

const db =  {
  category: [
    {
      id: 1,
      name: 'Название модуля',
      lessons: [], // ID уроков этой категории
      tests: [], // ID тестов этой категории
      tasks: [] // ID задач этой категории
    },
  ],
  lessons: [
    {
      id: 1,
      name: 'Название урока',
      content: [
        {
          tag: 'Название тега',
          class: ['Название класса'],
          text: 'Текст урока'
        },        
      ],
      links: {
        prev: 'link', // ID предыдущего урока
        next: 'link', // ID следующего урока
        test: 'link', // ID теста к этому уроку
        task: 'link' // ID задачи к этому уроку
      }
    },
  ],
  tests: [
    {
      id: 1,
      name: 'Название теста',
      questions: [
        {
          id: 1,
          question: 'Текст вопроса',
          answers: ['Текст вариантов ответа'],
          rightAnswer: ['Текст правильного ответа'] // Может быть один или несколько
        },        
      ],
      links: {
        prev: 'link', // ID предыдущего теста
        next: 'link', // ID следующего теста
        lesson: 'link', // ID урока к этому тесту
        task: 'link' // ID задачи к этому тесту
      }
    },
  ],
  tasks: [
    {
      id: 1,
      name: 'Название задачи',
      content: [
        {
          tag: 'Название тега',
          class: ['Название класса'],
          text: 'Текст урока'
        },        
      ],
      links: {
        prevTaskBlock: 'link', // ID предыдущего блока задач
        nextTaskBlock: 'link', // ID следующего следующего
        test: 'link', // ID теста к этому блоку задач
        lesson: 'link', // ID урока к этому блоку задач
        nextLesson: 'link', // ID следующего урока
        prevLesson: 'link' // ID следующего урока
      }
    },
  ],
  comments: [
    {
      id: 1,
      lesson: 1, // ID урока, к которому относится комментарий
      user: 1, // ID пользователя, который написал комментарий
      content: 'Текст комментария'
    }
  ],
  
}


const dbAuthUsers =  {
  users: [
    {
      id: 1,
      email: 'email пользователя',
      password: 'Пароль пользователя',
      name: 'Имя пользователя',
      done: {
        lessons: [], // ID уроков, которые прошел пользователь
        tests: [{
          id: 1, // ID пройденного теста
          result: 50 // последний результат
        }],
        tasks: [] // ID задач, которые решил пользователь
      }
    }
  ]
}


const server = jsonServer.create()
const router = jsonServer.router(dbAuthUsers)
const router2 = jsonServer.router(db)
const userdb = JSON.parse(fs.readFileSync('./users.json', 'UTF-8'))

server.use(bodyParser.urlencoded({extended: true}))
server.use(bodyParser.json())
server.use(jsonServer.defaults());

server.use(router2)

const SECRET_KEY = '123456789'

const expiresIn = '1h'

// Create a token from a payload 
function createToken(payload){
  return jwt.sign(payload, SECRET_KEY, {expiresIn})
}

// Verify the token 
function verifyToken(token){
  return  jwt.verify(token, SECRET_KEY, (err, decode) => decode !== undefined ?  decode : err)
}

// Check if the user exists in database
function isAuthenticated({email, password}){
  return userdb.users.findIndex(user => user.email === email && user.password === password) !== -1
}

// Register New User
server.post('/auth/register', (req, res) => {
  console.log("register endpoint called; request body:");
  console.log(req.body);
  const {email, password} = req.body;

  if(isAuthenticated({email, password}) === true) {
    const status = 401;
    const message = 'Email and Password already exist';
    res.status(status).json({status, message});
    return
  }

fs.readFile("./users.json", (err, data) => {  
    if (err) {
      const status = 401
      const message = err
      res.status(status).json({status, message})
      return
    };

    // Get current users data
    var data = JSON.parse(data.toString());

    // Get the id of last user
    var last_item_id = data.users[data.users.length-1].id;

    //Add new user
    data.users.push({id: last_item_id + 1, email: email, password: password}); //add some data
    var writeData = fs.writeFile("./users.json", JSON.stringify(data), (err, result) => {  // WRITE
        if (err) {
          const status = 401
          const message = err
          res.status(status).json({status, message})
          return
        }
    });
});

// Create token for new user
  const access_token = createToken({email, password})
  console.log("Access Token:" + access_token);
  res.status(200).json({access_token})
})

// Login to one of the users from ./users.json
server.post('/auth/login', (req, res) => {
  console.log("login endpoint called; request body:");
  console.log(req.body);
  const {email, password} = req.body;
  if (isAuthenticated({email, password}) === false) {
    const status = 401
    const message = 'Incorrect email or password'
    res.status(status).json({status, message})
    return
  }
  const access_token = createToken({email, password})
  console.log("Access Token:" + access_token);
  res.status(200).json({access_token})
})

server.use(/^(?!\/auth).*$/,  (req, res, next) => {
  if (req.headers.authorization === undefined || req.headers.authorization.split(' ')[0] !== 'Bearer') {
    server.use(router2)
    return
  }
  try {
    let verifyTokenResult;
     verifyTokenResult = verifyToken(req.headers.authorization.split(' ')[1]);

     if (verifyTokenResult instanceof Error) {
       const status = 401
       const message = 'Access token not provided'
       res.status(status).json({status, message})
       return
     }
     next()
  } catch (err) {
    const status = 401
    const message = 'Error access_token is revoked'
    res.status(status).json({status, message})
  }
})

server.use(router)

server.listen(8000, () => {
  console.log('Run Auth API Server')
})