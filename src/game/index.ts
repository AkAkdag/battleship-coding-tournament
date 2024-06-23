import logger from "$utils/logger";
import BasicBrain from "src/brains/basic";
import Player from "./objects/player";
import type { BrainConstructor, brainGameData } from "./objects/brain";
import { CellState } from "./objects/playboardCell";
import { ShipState } from "./objects/ship";

export type GameArgs = {
    player1Brain: BrainConstructor,
    player2Brain: BrainConstructor,
    renderSettings?: RenderSettings
}

type RenderSettings = {
    fullGame: boolean
}

export default class Game {
    player1: Player;
    player2: Player;
    playerTurn: 1 | 2 = 1;
    winner: Player | false = false;
    renderSettings: RenderSettings;
    turnCount: number = 0;

    constructor(args: GameArgs){
        this.player1 = new Player(
            "Player 1",
            args.player1Brain
        );
        this.player2 = new Player(
            "Player 2",
            args.player2Brain
        );

        this.renderSettings = args.renderSettings || {
            fullGame: true
        };

        this.render();
    }

    start(){
        this.player1.start();
        this.player2.start();

        this.player1.playboard.lock()
        this.player2.playboard.lock();

        this.render();

        while(!this.winner){
            this.updateTick();
            this.checkForGameOver();
            this.render();
        }
    }

    updateTick(){
        const currentPlayer = this.playerTurn === 1 ? this.player1 : this.player2;
        const enemyPlayer = this.playerTurn === 1 ? this.player2 : this.player1;

        this.updatePlayerData();

        // Attack the enemy player
        const attackCoords = currentPlayer.turn();
        if (!attackCoords){
            logger.error("No attack coordinates returned from player " + currentPlayer.name);
            return;
        }
        const {x, y} = attackCoords;
        enemyPlayer.playboard.receiveAttack(x, y);

        this.updatePlayerData();

        // finish the turn
        this.playerTurn = this.playerTurn === 1 ? 2 : 1;
        this.turnCount++;
    }

    checkForGameOver(){
        if (this.player1.allShipsSunk()){
            this.winner = this.player2;
            logger.log("Player 2 wins!");
        } else if (this.player2.allShipsSunk()){
            this.winner = this.player1;
            logger.log("Player 1 wins!");
        }
    }

    updatePlayerData(){
        const currentPlayer = this.playerTurn === 1 ? this.player1 : this.player2;
        const enemyPlayer = this.playerTurn === 1 ? this.player2 : this.player1;

        currentPlayer.updateBrain({
            myBoard: currentPlayer.playboard.export(),
            enemyBoard: enemyPlayer.playboard.exportMaskedForOpponent(),
            myShips: currentPlayer.exportShips()
        });
        enemyPlayer.updateBrain({
            myBoard: enemyPlayer.playboard.export(),
            enemyBoard: currentPlayer.playboard.exportMaskedForOpponent(),
            myShips: enemyPlayer.exportShips()
        });
    }

    render(){
        if (!this.renderSettings.fullGame){
            return;
        }
        // clear the screen
        console.clear();

        console.log("----- Welcome to Battleship! -----");
        console.log("");
        console.log("Player 1");
        console.log("");
        this.player1.playboard.printPlayboard();

        console.log("");
        console.log("");
        console.log("Player 2");
        console.log("");
        this.player2.playboard.printPlayboard();

        console.log("");
        console.log("");
        logger.printAll(20);
    }

    getStats(){
        if (!this.isGameOver()){
            logger.error("Game is not over. Cannot get stats");
            return false;
        }
        const player1TotalHits = this.player1.playboard.getCellsByState(CellState.hit).length;
        const player1TotalMisses = this.player1.playboard.getCellsByState(CellState.miss).length;
        const player2TotalHits = this.player2.playboard.getCellsByState(CellState.hit).length;
        const player2TotalMisses = this.player2.playboard.getCellsByState(CellState.miss).length;

        return {
            totalTurns: this.turnCount,
            winner: this.winner ? this.winner.name : false,
            player1: {
                hitsTaken: player1TotalHits,
                accuracy: Math.round(
                    100 / (player2TotalHits + player2TotalMisses) * player2TotalHits * 100
                ) / 100,
            },
            player2: {
                hitsTaken: player2TotalHits,
                accuracy: Math.round(
                    100 / (player1TotalHits + player1TotalMisses) * player1TotalHits * 100
                ) / 100,
            }
        }
    }

    isGameOver(){
        return this.winner !== false;
    }
}

export type GameStats = ReturnType<Game["getStats"]>;