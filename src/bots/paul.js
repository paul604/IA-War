function iaGenerator(mapSize) {
    return {
        teleport: false,
        out : false,
        outx: null,
        outy: null,
        decalx:42,
        decaly: 42,
        map: null,
        mouvChoice: null,


        //---------------------------------------------------------------------------

        saveWall: function saveWall(walls, mapSize) {
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

        initMouvChoice: function initMouvChoice() {
            this.mouvChoice = new Array();
            this.mouvChoice[0]={x:0, y:-1};
            this.mouvChoice[1] ={x:1, y:-1};
            this.mouvChoice[2] ={x:1, y:0};
            this.mouvChoice[3] ={x:1, y:1};
            this.mouvChoice[4] ={x:0, y:1};
            this.mouvChoice[5] ={x:-1, y:1};
            this.mouvChoice[6] ={x:-1, y:0};
            this.mouvChoice[7] ={x:-1, y:-1};
        },

        getMouvChoice: function getMouvChoice(x, y) {
            this.mouvChoice.forEach(function (element, index) {
                if(element.x === x && element.y === y){
                    return index;
                }
            });
            return NaN;
        },

        choixMouve: function choixMouve(choice, count){
          // if(x === 0 && y ===-1){//haut
          //   return  {x:1 ,y:y};
          // }else if(x === 1 && y === -1){//hd
          //   return  {x:x ,y:0};
          // }else if(x === 1 && y === 0){//d
          //   return  {x:x ,y:1};
          // }else if(x === 1 && y === 1){//bd
          //   return  {x:0 ,y:y};
          // }else if(x === 0 && y === 1){//b
          //   return  {x:-1 ,y:y};
          // }else if(y === 1){//bg
          //   return  {x:x ,y:0};
          // }else if(y === 0){//g
          //   return  {x:x ,y:-1};
          // }else if(y === -1){//hg
          //   return  {x:0 ,y:-1};
          // }else {
          //   return {x:0 ,y:0};
          // }
        },

        testMove: function testMove(mapSize, position, moveX, moveY) {
            var testx=position.x+moveX;
            var testy=position.y+moveY;
            if (testx<0 || testx>=mapSize || testy<0 || testy>=mapSize || this.map[testx][testy] === 1) {
            return false;
            }
            return true;
        },

        move: function move(mapSize, position, moveX, moveY) {
            if(!this.testMove(mapSize, position, moveX, moveY)){
            //   var tabMove = choixMouve(moveX, moveY);
              var tabMove = this.choixMouve(this.getMouvChoice(moveX, moveY), 1);
              moveX=tabMove.x;
              moveY=tabMove.y;
              return this.move(mapSize, position, moveX, moveY)
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
            this.saveWall(walls, mapSize);
            this.initMouvChoice();
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
                resultMove = this.move(mapSize, position, x, y);
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
              resultMove = this.move(mapSize, positionOut, 1, 0);
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
