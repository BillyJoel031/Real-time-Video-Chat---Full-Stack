import React, { useEffect, useRef, useState } from "react";
import CryptoJS from "crypto-js";

interface Message {
  action: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data?: any;
  roomId: string;
  userID: number;
  targetUserID?: number;
  senderUserID?: number;
  clients?: number[];
}

interface JoinMeetingSectionProps {
  handleLeave: () => void;
}

const JoinMeetingSection: React.FC<JoinMeetingSectionProps> = ({
  handleLeave,
}) => {
  const [userID, setUserID] = useState<number | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<
    Record<number, { stream: MediaStream; loading: boolean }>
  >({});

  const localVideoRef = useRef<HTMLVideoElement | null>(null);

  if (!process.env.NEXT_PUBLIC_ICE_SERVERS_URL) {
    throw new Error(
      "ICE_SERVERS_URL is not defined. Please set it in your environment variables."
    );
  }

  const staticAuthSecret = "north";

  // Generate a username as a Unix timestamp (e.g., valid for 24 hours)
  const unixTimestamp = Math.floor(Date.now() / 1000) + 24 * 60 * 60; // Valid for 24 hours
  const username = unixTimestamp.toString();

  // Generate the HMAC-SHA1 password using the static-auth-secret with crypto-js
  const password = CryptoJS.HmacSHA1(username, staticAuthSecret).toString(
    CryptoJS.enc.Base64
  );

  // Now use the generated `username` and `password` in the RTC configuration
  const peerConnectionConfig: RTCConfiguration = {
    iceServers: [
      { urls: process.env.NEXT_PUBLIC_ICE_SERVERS_URL },
      {
        urls: "turn:54.89.34.2:3478",
        username: username, // Dynamic username based on timestamp
        credential: password, // HMAC-SHA1 hash as the password
      },
    ],
  };

  let localStream: MediaStream | null = null;
  const peerConnections: Record<number, RTCPeerConnection> = {};
  let socket: WebSocket | null = null;

  const [roomId, setRoomId] = useState<string>("");
  const messageQueue: string[] = [];

  useEffect(() => {
    const userId = localStorage.getItem("userId");
    if (userId) {
      setUserID(parseInt(userId));
    }
  }, []);

  useEffect(() => {
    if (userID !== null) {
      ensureLocalStream();
    }
    return () => {
      if (socket) socket.close();
      Object.values(peerConnections).forEach((pc) => pc.close());
    };
  }, [userID, roomId]);

  const joinRoom = () => {
    if (userID !== null && roomId) {
      initializeWebSocket();
    } else {
      console.error("Room ID and User ID are required to join the room.");
    }
  };

  const initializeWebSocket = () => {
    socket = new WebSocket(`${process.env.NEXT_PUBLIC_WEBSOCKET_URL}`);

    socket.onopen = () => {
      console.log("WebSocket connection opened");

      sendMessage({
        action: "join",
        roomId: roomId,
        userID: userID as number,
      });

      while (messageQueue.length > 0) {
        if (socket) {
          socket.send(messageQueue.shift() as string);
        }
      }
    };

    socket.onmessage = async (message) => {
      let msg: Message;
      try {
        msg = JSON.parse(message.data);
      } catch {
        console.error("Failed to parse message as JSON:", message.data);
        return;
      }
      const { action, data, senderUserID } = msg;

      if (senderUserID === userID) return;

      switch (action) {
        case "joined":
          await ensureLocalStream();
          msg.clients?.forEach(async (existingUserID) => {
            if (existingUserID !== userID && !peerConnections[existingUserID]) {
              await initializePeerConnection(existingUserID, true);
            }
          });
          break;
        case "new-peer":
          if (senderUserID !== undefined) {
            await initializePeerConnection(senderUserID, false);
          }
          break;
        case "offer":
          await handleOffer(data, senderUserID as number);
          break;
        case "answer":
          await handleAnswer(data, senderUserID as number);
          break;
        case "candidate":
          await handleCandidate(data, senderUserID as number);
          break;
        default:
          console.warn("Unknown action:", action);
          break;
      }
    };

    socket.onerror = (error) => {
      console.error("WebSocket error:", error);
    };

    socket.onclose = () => {
      console.log("WebSocket connection closed");
    };
  };

  const ensureLocalStream = async () => {
    if (!localStream) {
      try {
        localStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = localStream;
        }
      } catch (error) {
        console.error("Error accessing media devices.", error);
      }
    }
  };

  const initializePeerConnection = async (
    remoteUserID: number,
    isInitiator: boolean
  ) => {
    await ensureLocalStream();

    const pc = new RTCPeerConnection(peerConnectionConfig);

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        sendMessage({
          action: "candidate",
          data: event.candidate,
          roomId: roomId,
          userID: userID as number,
          targetUserID: remoteUserID,
        });
      }
    };

    pc.ontrack = (event) => {
      if (event.streams && event.streams[0]) {
        setRemoteStreams((prevStreams) => ({
          ...prevStreams,
          [remoteUserID]: { stream: event.streams[0], loading: false },
        }));
      }
    };

    //Set loading state for remote stream
    setRemoteStreams((prevStreams) => ({
      ...prevStreams,
      [remoteUserID]: { stream: new MediaStream(), loading: true },
    }));

    // Monitor connection state
    pc.onconnectionstatechange = () => {
      if (
        pc.connectionState === "disconnected" ||
        pc.connectionState === "failed" ||
        pc.connectionState === "closed"
      ) {
        console.log(`User ${remoteUserID} disconnected`);
        setRemoteStreams((prevStreams) => {
          const updatedStreams = { ...prevStreams };
          delete updatedStreams[remoteUserID];
          return updatedStreams;
        });
        pc.close();
        delete peerConnections[remoteUserID];
      }
    };

    pc.oniceconnectionstatechange = () => {
      if (
        pc.iceConnectionState === "disconnected" ||
        pc.iceConnectionState === "failed" ||
        pc.iceConnectionState === "closed"
      ) {
        console.log(`User ${remoteUserID} ICE connection lost`);
        setRemoteStreams((prevStreams) => {
          const updatedStreams = { ...prevStreams };
          delete updatedStreams[remoteUserID];
          return updatedStreams;
        });
        pc.close();
        delete peerConnections[remoteUserID];
      }
    };

    localStream
      ?.getTracks()
      .forEach((track) => pc.addTrack(track, localStream as MediaStream));
    peerConnections[remoteUserID] = pc;

    if (isInitiator) {
      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        sendMessage({
          action: "offer",
          data: offer,
          roomId: roomId,
          userID: userID as number,
          targetUserID: remoteUserID,
        });
      } catch (error) {
        console.error("Error creating offer:", error);
      }
    }
  };

  const handleOffer = async (
    offer: RTCSessionDescriptionInit,
    senderUserID: number
  ) => {
    const pc = peerConnections[senderUserID];
    if (pc) {
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        sendMessage({
          action: "answer",
          data: answer,
          roomId: roomId,
          userID: userID as number,
          targetUserID: senderUserID,
        });
      } catch (error) {
        console.error("Error handling offer from:", senderUserID, error);
      }
    }
  };

  const handleAnswer = async (
    answer: RTCSessionDescriptionInit,
    senderUserID: number
  ) => {
    const pc = peerConnections[senderUserID];
    if (pc) {
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
      } catch (error) {
        console.error("Error handling answer from:", senderUserID, error);
      }
    }
  };

  const handleCandidate = async (
    candidate: RTCIceCandidateInit,
    senderUserID: number
  ) => {
    const pc = peerConnections[senderUserID];
    if (pc) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (error) {
        console.error("Error adding ICE candidate from:", senderUserID, error);
      }
    }
  };

  const sendMessage = (message: Message) => {
    const fullMessage = { ...message, userID };
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(fullMessage));
    } else {
      messageQueue.push(JSON.stringify(fullMessage));
    }
  };

  return (
    <div>
      <div className="flex justify-between gap-6">
        <input
          type="text"
          placeholder="Enter room id"
          value={roomId}
          required
          onChange={(e) => setRoomId(e.target.value)}
          className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          onClick={joinRoom}
          className="w-[10rem] px-4 py-2 text-white bg-blue-500 rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          Join Room
        </button>
      </div>
      <div
        className={`grid gap-4 mt-5 ${
          Object.keys(remoteStreams).length + 1 === 2
            ? "grid-cols-2"
            : "grid-cols-2 md:grid-cols-3"
        }`}
      >
        <div className="flex flex-col items-center justify-center">
          {userID && <h3>You</h3>}
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-64 bg-gray-800 rounded-md"
          />
        </div>
        {Object.keys(remoteStreams).map((remoteID) => (
          <div
            className="flex flex-col items-center justify-center"
            key={remoteID}
          >
            {remoteStreams[parseInt(remoteID)].loading ? (
              <div className="w-64 h-48 flex items-center justify-center bg-gray-300 rounded-md">
                <span>Waiting for User {remoteID}&apos;s video...</span>
              </div>
            ) : (
              <>
                <span>Remote Video from User Id {remoteID}</span>
                <video
                  ref={(video) => {
                    if (video && remoteStreams[parseInt(remoteID)].stream) {
                      video.srcObject =
                        remoteStreams[parseInt(remoteID)].stream;
                    }
                  }}
                  autoPlay
                  playsInline
                  className="w-full h-64 bg-gray-800 rounded-md"
                />
              </>
            )}
          </div>
        ))}
      </div>

      <div className="flex justify-end mt-10">
        <button
          className="px-4 py-2 text-white bg-red-500 rounded-md hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500"
          onClick={handleLeave}
        >
          Leave Meeting
        </button>
      </div>
    </div>
  );
};

export default JoinMeetingSection;
