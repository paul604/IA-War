function iaGenerator(mapSize) {
        var teleport = false;
        var out = false;
        var outx;
        var outy;
        var decalx=42;
        var decaly=42;
    return {


        /**
        * getName - Retourne ici ton nom de guerrier
        *
        * @return {string}
        */
        getName: function getName() {
            return "Paul2";
        },

        /**
         * onFriendWins - fonction qui est appelée quand un ami gagne
         *
         * @param {Object} exit - la positions de la sortie { x: ... , y: ... }
         * @return {void}
         */
        onFriendWins: function onFriendWins(exit) {
            out=true;
            outx=exit.x;
            outy=exit.y;
            console.log(exit);
        },

        /**
         * onResponseX - fonction appelée quand le jeux nous donne
         * la position horizontale relative de notre joueur par rapport à la sortie
         *
         * @param {number} hPosition
         * @return {void}
         */
        onResponseX: function onResponseX(hPosition) {
            //1 je suis trop à gauche
            //-1 je suis trop à droite
            //0 je suis en face de la sortie
            decalx=hPosition;
            console.log(hPosition);
        },

        /**
         * onResponseY - fonction appelée quand le jeux nous donne
         * la position verticale relative de notre joueur par rapport à la sortie
         *
         * @param {number} vPosition
         * @return {void}
         */
        onResponseY: function (vPosition) {
            //1 je suis trop bas
            //-1 je suis trop haut
            //0 je suis en face de la sortie
            decaly=vPosition;
            console.log(vPosition);
        },

        /**
        * action - fonction appelée par le moteur de jeu à chaque tour
        * ici, il faut retourner un object qui décrit
        * l'action que doit faire le bot pour ce tour.
        *
        * @param {object} position - la position actuelle de votre bot
        * @param {number} round - le numéro de tour en cours
        * @return {object} action - l'action à effectuer
        */
        action: function action(position, round, w) {
          var x=0;
          var y=0;
          var choix = "";
          var ask;

          if(out && !teleport){
            choix = "teleport";
            x=outx-1;
            y=outy;
          }else if(out && teleport){
            choix = "move";
            x=1;
          }

          if(decalx===42){
            choix = "ask";
            ask="x";
          }else if(decaly === 42){
            choix = "ask";
            ask="y";
          }else {
            choix = "move";
            x=decalx;
            y=decaly;
            if (decalx != 0) {
              decalx=42;
            }
            if(decaly != 0){
              decaly=42;
            }
          }



          var action ={};
          switch (choix){
            case "move":
              action = {
                action: "move",
                params: {
                  dx: x, //1 mouvement positif, -1 mouvement négatif, 0 aucun mouvement sur cet axe
                  dy: y
              }};
              break;
            case "ask":
              action = {
                action: "ask",
                params: ask
              };
              break;
            case "teleport":
              teleport=true;
              action = {
                action: "teleport",
                params: {
                    x: x,
                    y: y
              }};
              break;
          }
            return action;
        }
    };
}

//---------------------------------------------------------------------------

// function move(mapSize, position, mouveX, mouveY) {
//   var testok=false;
//   for (var i = 0; i < 8 && !testok; i++) {
//     testok=testMove(mapSize, position, mouveX, mouveY);
//     if(!testok){
//
//     }
//   }
// }

function testMove(mapSize, position, mouveX, mouveY) {
  var testx=position.x+mouveX;
  var testy=position.y+mouveY;
  if (testx<=0 || testx>mapSize-1 || testy<=0 || testy>mapSize-1) {
    return false;
  }
}

module.exports = iaGenerator;
