require('dotenv').config();

const express = require('express');
const Graphql = require('graphql').graphql;
const jwt = require('express-jwt');
const bodyParser = require('body-parser');

const { graphiqlExpress } = require('apollo-server-express');
/* const socketioJwt = require('socketio-jwt'); */
const cors = require('cors');
const schema = require('./schema');
const {
  login,
  loginAdmin,
  createPublication,
  uploadAgencyImages,
  getFiltersAndTotalResult,
  getSoldPublications,
  registerAgency,
  registerUser,
} = require('./routes');
const multer = require('multer');

const { execute, subscribe } = require('graphql');
const graphqlHTTP = require('express-graphql');
const { createServer } = require('http');
const { SubscriptionServer } = require('subscriptions-transport-ws');

const upload = multer({ dest: './images' });
const app = express();

// ************* PLAYGROUND ****************\
/* const {
  User,
  Publication,
  PublicationState,
  CommentThread,
  Message,
  HistoryState,
  sequelize,
} = require('./models').mah;

CommentThread.findById(1)
  .then(ct =>
    Message.create({
      commentThread_id: 1,
      content: 'Hola!!!',
      createdAt: moment(),
      updatedAt: moment(),
    })
      .then((msg) => {
        ct.setMessages(msg.id);
      })

      .then(() => ct.getMessages())
      .then(res => console.log('RESP', JSON.stringify(res)))); */

// ***************************************** */

// SERVER CONFIGURATION ----------------------------------------------
app.use(cors());
app.use(bodyParser.json()); // for parsing application/json
app.use(bodyParser.urlencoded({ extended: true })); // for parsing application/x-www-form-urlencoded

// app.use('/graphql', bodyParser.json(), graphqlExpress({ schema }));
app.use('/graphql', graphqlHTTP({
  schema,
}));
app.use(
  '/graphiql',
  graphiqlExpress({
    endpointURL: '/graphql',
    subscriptionsEndpoint: 'wss://api.miautohoy.com/subscriptions',
  }),
);

const ws = createServer(app);

// Set up the WebSocket for handling GraphQL subscriptions
ws.listen(process.env.PORT || 4000, () => {
  console.log(`Running a GraphQL API server at http://localhost:${process.env.PORT ||
      4000}/graphiql`);

  SubscriptionServer.create(
    {
      execute,
      subscribe,
      schema,
    },
    {
      server: ws,
      path: '/subscriptions',
    },
  );
});

const httpGraphQLHandler = (req, res) => {
  const { query, variables, rootVals } = req.query;
  const authToken = req.user || {};
  return Graphql(schema, query, { authToken, rootVals }, variables)
    .then(result => res.send(result))
    .catch(err => console.log(err));
};
app.post('/', httpGraphQLHandler);
app.use('/images', express.static(`${__dirname}/images`));

app.use(jwt({ secret: 'MAH2018!#' }).unless({
  path: [
    '/subscriptions',
    '/graphql',
    '/login',
    '/loginAdmin',
    '/createPublication',
    '/registerAgency',
    '/registerUser',
    '/getFiltersAndTotalResult',
    /^\/images/,
  ],
}));

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header(
    'Access-Control-Allow-Headers',
    'Origin, X-Requested-With, Content-Type, Accept, Authorization',
  );
  next();
});

/* console.log(schema.getSubscriptionType().getFields().messageAdded) */

// ===================================================================

// SOCKETS ------------------------------------------------------------
/* const socketServer = require('http').createServer(app);
const io = require('socket.io')(socketServer);

socketServer.listen(process.env.PORT || 4100);

io.use((socket, next) => {
  const handShake = socket.handshake;
  const { token } = handShake.query;
  if (jsonwt.verify(token, 'MAH2018!#')) {
    next();
  }
  next(new Error('No autorizado'));
});

io.of('/offerChat').on('connection', (socket) => {
  const id = socket.handshake.query.offerId;
  const sockets = {};
  if (id !== '') {
    sockets[id] = socket;
  }
  socket.on('sellerTyping', () => {
    socket.broadcast.emit('sellerTyping');
  });
  socket.on('sellerStopTyping', () => {
    socket.broadcast.emit('sellerStopTyping');
  });
  socket.on('buyerTyping', () => {
    socket.broadcast.emit('buyerTyping');
  });
  socket.on('buyerStopTyping', () => {
    socket.broadcast.emit('buyerStopTyping');
  }); */

/*   socket.on('newMessage', (data) => {
    createMessage(data.id_from, data.id_to, data.messageThread_id, data.content)
      .then((res) => {
        socket.emit('messageCreated', res);
        socket.broadcast.emit('messageCreated', res);
      });
  });
});
*/
// ===================================================================

// ROUTES --------------------------------------------------------------
app.post('/login', login);
app.post('/loginAdmin', loginAdmin);
app.post(
  '/createPublication',
  upload.array('imageGroup', 8),
  createPublication,
);
app.post('/getFiltersAndTotalResult', getFiltersAndTotalResult);
app.get('/getSoldPublications', getSoldPublications);
app.get('/registerAgency', registerAgency);
app.get('/registerUser', registerUser);
app.post(
  '/uploadAgencyImages/:id',
  upload.fields([
    { name: 'profileImage', maxCount: 1 },
    { name: 'bannerImage', maxCount: 1 },
  ]),
  uploadAgencyImages,
);
// ===================================================================
