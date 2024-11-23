import React, { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "./DragDrop.css";

const DragDropUploader: React.FC = () => {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [uploadMessage, setUploadMessage] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    const files = event.dataTransfer.files;
    handleFiles(files);
  };

  const handleFiles = async (files: FileList) => {
    if (files.length > 0) {
      const file = files[0];
      if (!file.name.endsWith(".wav")) {
        setUploadMessage("Please upload a WAV file.");
        return;
      }

      const formData = new FormData();
      formData.append("file", file);

      try {
        setIsProcessing(true);
        setUploadProgress(0);

        const response = await axios.post("http://127.0.0.1:5000/upload", formData, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
          onUploadProgress: (progressEvent) => {
            if (progressEvent.total) {
              const percentCompleted = Math.round(
                (progressEvent.loaded * 100) / progressEvent.total
              );
              setUploadProgress(percentCompleted);
            }
          },
        });

        if (response.status === 200) {
          navigate("/success");
        } else {
          setUploadMessage("Error processing file. Please try again.");
        }
      } catch (error) {
        setUploadMessage("Error uploading file. Please try again.");
        console.error(error);
      } finally {
        setIsProcessing(false);
      }
    }
  };

  const handleClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click(); // Programmatically trigger the file input
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      handleFiles(files);
    }
  };

  return (
    <div
      onClick={handleClick}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`drag-drop-area ${isDragging ? "dragging" : ""}`}
    >
      <input
        type="file"
        ref={fileInputRef}
        style={{ display: "none" }}
        accept=".wav"
        onChange={handleFileChange}
      />
      <div className="drag-drop-plus">
        {isProcessing ? `${uploadProgress}%` : "+"}
      </div>

      {uploadMessage && <p className="upload-message">{uploadMessage}</p>}
    </div>
  );
};

export default DragDropUploader;
