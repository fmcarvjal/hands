import React, { useEffect, useRef, useState } from "react";
import * as handTrack from "handtrackjs";
import "./App.css";
import imagen from "./assets/imagen/manzana.png";
import imagen1 from "./assets/imagen/naranja.png";

function App() {
  const synth = window.speechSynthesis;
  const buttonLabels = ["ARRIBA", "ABAJO", "IZQUIERDA", "DERECHA"];
  const getRandomButtonIndex = () => {
    // Genera un índice aleatorio para seleccionar un botón al azar
    return Math.floor(Math.random() * buttonLabels.length);
  };
  const [progressWidth, setProgressWidth] = useState(0);

  //---------------------------------------------------------------------------
  const [correctCount, setCorrectCount] = useState(0); // Contador de respuestas correctas
  const [messageCount, setMessageCount] = useState(0); // Contador de mensajes de voz
  const [gameStarted, setGameStarted] = useState(false); // Variable para controlar el inicio del juego
  const [expectedButtonIndex, setExpectedButtonIndex] = useState(null); // Índice del botón esperado
  const [enableStartButton, setEnableStartButton] = useState(true); // Habilitar o deshabilitar el botón "Iniciar Juego"

  const videoRef = useRef(null);
  const [handClosed, setHandClosed] = useState(false);
  const [handPosition, setHandPosition] = useState({ x: 0, y: 0 });
  const [buttonColors, setButtonColors] = useState([
    "Verde",
    "Verde",
    "Verde",
    "Verde",
  ]);
  const [lastClickedButton, setLastClickedButton] = useState(null);
  const [disabledButtons, setDisabledButtons] = useState([]);

  const speakText = (text) => {
    const utterance = new SpeechSynthesisUtterance(text);
    synth.speak(utterance);
  };

  useEffect(() => {
    if (gameStarted) {
      const interval = setInterval(() => {
        if (messageCount < 10) {
          const randomIndex = getRandomButtonIndex();
          const buttonText = buttonLabels[randomIndex];
          speakText(buttonText);
          setMessageCount((prevCount) => prevCount + 1);
          setExpectedButtonIndex(randomIndex);
        } else {
          clearInterval(interval); // Detener el intervalo después de 10 mensajes
          setEnableStartButton(true); // Habilitar el botón "Iniciar Juego"
          speakText(
            "Muy buen trabajo."
          );
          setGameStarted(false)
          setMessageCount(0)
          setCorrectCount(0)
          //window.location.reload();
        }
      }, 5000); // Repetir cada 5 segundos
      if (messageCount === 0) {
        speakText(
          "Selecciona los rectángulos de acuerdo a la indicación que se escuchará a continuación."
        );
      }
      return () => {
        clearInterval(interval); // Limpiar el intervalo al desmontar el componente
      };
    }
  }, [gameStarted, messageCount]);

  useEffect(() => {
    const runHandDetection = async () => {
      const video = videoRef.current;
      const defaultParams = {
        flipHorizontal: true,
        outputStride: 16,
        imageScaleFactor: 0.5,
        maxNumBoxes: 20,
        iouThreshold: 0.8,
        scoreThreshold: 0.6,
        modelType: "ssd320fpnlite",
        modelSize: "medium",
        bboxLineWidth: "1",
        fontSize: 17,
      };

      const model = await handTrack.load(defaultParams);
      await handTrack.startVideo(video);

      const detectHand = async () => {
        const predictions = await model.detect(video);

        predictions.forEach((prediction) => {
          const { label, bbox } = prediction;
          const [x, y] = bbox;

          if (label === "closed") {
            console.log("¡Mano cerrada detectada!");
            setHandClosed(true);
            setHandPosition({ x, y });
            setLastClickedButton(null); // Reset last clicked button when hand is closed
          } else if (label === "open") {
            console.log("¡Mano abierta detectada!");
            setHandClosed(false);
            setHandPosition({ x, y });
            handleButtonClick(x, y);
          } else if (label === "pinchtipoo") {
            console.log("¡Escribir!");
          }
        });

        requestAnimationFrame(detectHand);
      };

      detectHand();

      return () => {
        model.dispose();
      };
    };

    runHandDetection();
  }, []);

  const handleButtonClick = (x, y) => {
    const buttons = document.getElementsByClassName("button");
    const buttonWidth = buttons[0].offsetWidth;
    const buttonHeight = buttons[0].offsetHeight;

    let clickedButton = null;

    Array.from(buttons).forEach((button) => {
      const rect = button.getBoundingClientRect();
      const buttonX = rect.left + rect.width / 2;
      const buttonY = rect.top + rect.height / 2;

      if (
        x >= buttonX - buttonWidth / 2 &&
        x <= buttonX + buttonWidth / 2 &&
        y >= buttonY - buttonHeight / 2 &&
        y <= buttonY + buttonHeight / 2
      ) {
        clickedButton = button;
      }
    });

    if (clickedButton && clickedButton !== lastClickedButton) {
      clickedButton.click();
      setLastClickedButton(clickedButton);
    }
  };

  const handleClick = (index) => {
    if (!disabledButtons.includes(index)) {
      const updatedColors = [...buttonColors];
      updatedColors[index] =
        buttonColors[index] === "Verde" ? "Amarillo" : "Verde";
      setButtonColors(updatedColors);

      setDisabledButtons((prevDisabled) => [...prevDisabled, index]);

      if (index === expectedButtonIndex) {
        setCorrectCount((prevCount) => prevCount + 1);
        setExpectedButtonIndex(null); // Reinicia el botón esperado
        setProgressWidth((prevWidth) => (prevWidth + 10 <= 100 ? prevWidth + 10 : 100)); // Incrementa el ancho de la barra
      }

      setTimeout(() => {
        setDisabledButtons((prevDisabled) =>
          prevDisabled.filter((btnIndex) => btnIndex !== index)
        );
      }, 2000); // Habilita el botón después de 2 segundos (ajusta el tiempo según tus necesidades)
    }
  };

  useEffect(() => {
    const handleResize = () => {
      const video = videoRef.current;
      video.width = window.innerWidth;
      video.height = window.innerHeight;
    };

    window.addEventListener("resize", handleResize);
    handleResize();

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  const handleStartGame = () => {
    // Iniciar el juego y reproducir el primer índice aleatorio
    setGameStarted(true);
    setEnableStartButton(false); // Deshabilitar el botón "Iniciar Juego"
  };

  return (
    <div className={`app-container ${handClosed ? "hand-closed" : ""}`}>
      <div className="video-container">
        <p>Correctos: {correctCount}</p>
        <p>Mensajes Repetidos: {messageCount}</p>
        <video ref={videoRef} autoPlay={true} />
      </div>

      <div className="progress-bar">
        <div
          className="progress-fill"
          style={{ width: `${(correctCount / 10) * 100}%` }}
        ></div>
      </div>

      {!handClosed && (
        <img
          className="hand-image"
          src={imagen}
          alt="Hand"
          style={{ left: handPosition.x, top: handPosition.y }}
        />
      )}
      {handClosed && (
        <img
          className="hand-image"
          src={imagen1}
          alt="Hand"
          style={{ left: handPosition.x, top: handPosition.y }}
        />
      )}
      <div className="button-container">
        <div className="button-row">
          <button
            className={`button ${
              buttonColors[0] === "Verde" ? "button-green" : "button-yellow"
            }`}
            onClick={() => handleClick(0)}
          >
            <h2>ARRIBA</h2>
          </button>
        </div>
        <div className="button-row2">
          <button
            className={`button ${
              buttonColors[2] === "Verde" ? "button-green" : "button-yellow"
            }`}
            onClick={() => handleClick(2)}
          >
            <h2>IZQUIERDA</h2>
          </button>
          <button
            className={`button ${
              buttonColors[3] === "Verde" ? "button-green" : "button-yellow"
            }`}
            onClick={() => handleClick(3)}
          >
            <h2>DERECHA</h2>
          </button>
        </div>
        <div className="button-row">
          <button
            className={`button ${
              buttonColors[1] === "Verde" ? "button-green" : "button-yellow"
            }`}
            onClick={() => handleClick(1)}
          >
            <h2>ABAJO</h2>
          </button>
        </div>
      </div>
      {!gameStarted && (
        <div className="start-button">
          <button
            onClick={handleStartGame}
            disabled={!enableStartButton} // Deshabilita el botón si no está permitido
          >
            Iniciar Juego
          </button>
        </div>
      )}
    </div>
  );
}

export default App;
