function iaGenerator(mapSize) {
    return {
        getName: function () {
            return "Felix";
        },

        onFriendWins: function (exit) {
            //exit est la position de la sortie { x: .., y: .. }
            console.log(exit);
        },

        onResponseX: function (hPosition) {
            //1 je suis trop à gauche
            //-1 je suis trop à droite
            //0 je suis en face de la sortie
            console.log(hPosition);
        },

        onResponseY: function (vPosition) {
            //1 je suis trop bas
            //-1 je suis trop haut
            //0 je suis en face de la sortie
            console.log(vPosition);
        },

        action: function (position, round) {
            var dx = Math.random() - 0.5;
            var dy = Math.random() - 0.5;

            var move = {
                action: "move",
                params: {
                    dx: dx,
                    dy: dy
                }
            };

            /** OU
            var ask = {
                action: "ask",
                params: "x"
            };

            var teleport = {
                action: "teleport",
                params: {
                    x: Math.round(Math.random() * mapSize),
                    y: Math.round(Math.random() * mapSize)
                }
            };
            */

            return move;
        }
    };
}

module.exports = iaGenerator;
