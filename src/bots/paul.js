//Paul ORHON
function iaGenerator(mapSize) {
    return {
        teleport: false,
        out : false,//onFriendWins ok
        outx: null,// out x
        outy: null,// out y
        decalx:42,
        decaly: 42,
        map: null,// tab of map
        movChoice: null,// tab for mov


        //---------------------------------------------------------------------------

        /**
        * saveWall - param la map avec 1 pour les murs
        *
        * @return {Array}
        */
        saveWall: function saveWall(walls) {
            this.map = new Array(mapSize);

            //init map
            for (var x = 0; x < mapSize; x++) {
              this.map[x]=new Array(mapSize);
              for (var y = 0; y < mapSize; y++) {
                  this.map[x][y]=0
              }
            }

            // init wall
            for (var wall of walls) {
            this.map[wall.x][wall.y]=1;
            }
        },

        /**
        * initMovChoice - init la liste des movement posible
        *
        * @return {void}
        */
        initMovChoice: function initMovChoice() {
            this.movChoice = new Array();
            this.movChoice[0]={x:0, y:-1};
            this.movChoice[1] ={x:1, y:-1};
            this.movChoice[2] ={x:1, y:0};
            this.movChoice[3] ={x:1, y:1};
            this.movChoice[4] ={x:0, y:1};
            this.movChoice[5] ={x:-1, y:1};
            this.movChoice[6] ={x:-1, y:0};
            this.movChoice[7] ={x:-1, y:-1};
        },

        /**
        * getMovChoice - retourne l'index corespondant dans movChoice
        *
        * @return {int}
        */
        getMovChoice: function getMovChoice(x, y) {
            var indexOk;
            this.movChoice.forEach(function (element, index) {
                if(element.x === x && element.y === y){
                    indexOk= index;
                    return indexOk;
                }
            });
            return indexOk;
        },

        /**
        * choixMove - choisie le mouvement suivant
        *
        * @return {int, int}
        */
        choixMove: function choixMove(choice, nbMov){
            var i;
            if(nbMov===2){
                i=-1;
            }else if(nbMov===3){
                i=1;
            }else if(nbMov===4){
                i=-2;
            }else if(nbMov===5){
                i=2;
            }else if(nbMov===6){
                i=-3;
            }else if(nbMov===7){
                i=3;
            }else if(nbMov===8){
                i=-4;
            }

            var index = choice+i;
            if(index<0){
                index=index+8;
            }else if(index>7){
                index=index-8;
            }

            console.log(choice+" "+nbMov+" "+index);
            return this.movChoice[index];
        },

        /**
        * testMove - verifi si le mouvement est valide
        *
        * @return {boolean}
        */
        testMove: function testMove(position, moveX, moveY) {
            var testx=position.x+moveX;
            var testy=position.y+moveY;
            if (testx<0 || testx>=mapSize || testy<0 || testy>=mapSize || this.map[testx][testy] === 1) {
            return false;
            }
            return true;
        },


        /**
        * testMove - demande la verification du movement et en choisi un autre si il est imposible
        *
        * @return {boolean}
        */
        move: function move(position, moveX, moveY, nbMov, initx, inity) {
            if (initx == null) {
                initx=moveX;
                inity=moveY;
                nbMov=1;
            }
            if(!this.testMove(position, moveX, moveY)){
            //   var tabMove = choixMove(moveX, moveY);
                nbMov=nbMov+1;
                var tabMove = this.choixMove(this.getMovChoice(initx, inity), nbMov);
                console.logtabMove
                moveX=tabMove.x;
                moveY=tabMove.y;
                return this.move(position, moveX, moveY, nbMov)
            }
            return {x:moveX, y:moveY};
        },


        //--------------------------------------------------------------


        /**
        * getName - Retourne ici ton nom de guerrier
        *
        * @return {string}
        */
        getName: function getName() {
            return "Paul";
        },

        /**
         * onFriendWins - fonction qui est appelée quand un ami gagne
         *
         * @param {Object} exit - la positions de la sortie { x: ... , y: ... }
         * @return {void}
         */
        onFriendWins: function onFriendWins(exit) {
            this.out=true;
            this.outx=exit.x;
            this.outy=exit.y;
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
            this.decalx=hPosition;
            console.log("paul x: "+hPosition);
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
            this.decaly=vPosition;
            console.log("paul y: "+vPosition);
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
        action: function action(position, round, walls) {
          console.log("action");
          if (round === 0) {
            this.saveWall(walls);
            this.initMovChoice();
          }
          var x=0;
          var y=0;
          var choix = "";
          var ask;

          if(this.out && !this.teleport){
            choix = "teleport";
          }else if(this.out && this.teleport){
            choix = "move";
          }else if(this.decalx===42){
            choix = "ask";
            ask="x";
          }else if(this.decaly === 42){
            choix = "ask";
            ask="y";
          }else {
            choix = "move";
            x=this.decalx;
            y=this.decaly;
          }



          var action ={};
          var resultMove;

          switch (choix){
            case "move":
              console.log(this.move);
              if(this.out && this.teleport){
                x=this.outx-position.x;
                y=this.outy-position.y;
              }else{
                resultMove = this.move(position, x, y, 0);
                if(resultMove.x !== 0 && resultMove.y !== 0){
                  this.decalx=42;
                  this.decaly=42;
                }
                x=resultMove.x;
                y=resultMove.y;
              }
              console.log(x+"  "+y);
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
              this.teleport=true;
              var positionOut ={
                x: this.outx,
                y: this.outy
              };
              resultMove = this.move(positionOut, 1, 0, 0);
              x=positionOut.x+resultMove.x;
              y=positionOut.y+resultMove.y;
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

module.exports = iaGenerator;
