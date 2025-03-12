import React from 'react';
import { useDropzone } from 'react-dropzone';
import styles from '../styles/ResumeUpload.module.scss';

const ResumeUpload = ({ setResumeFile }) => {
  const [uploadedFileName, setUploadedFileName] = React.useState(null);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'application/pdf': ['.pdf'], // Correct format for react-dropzone v11+
    },
    onDrop: (acceptedFiles) => {
      const file = acceptedFiles[0];
      setResumeFile(file);
      setUploadedFileName(file.name);
    },
  });

  const clearNotification = () => {
    setUploadedFileName(null);
    setResumeFile(null);
  };

  return (
    <div className={styles.container}>
      <div
        {...getRootProps()}
        className={`${styles.dropzone} ${isDragActive ? styles.active : ''}`}
      >
        <input {...getInputProps()} />
        {isDragActive ? (
          <p>Drop the resume here...</p>
        ) : (
          <p>Drag 'n' drop your resume PDF here, or click to browse</p>
        )}
      </div>
      {uploadedFileName && (
        <div className={styles.notification}>
          <span className={styles.checkmark}>✔</span>
          <span>Uploaded: {uploadedFileName}</span>
          <button onClick={clearNotification} className={styles.clearButton}>
            Clear
          </button>
        </div>
      )}
    </div>
  );
};

export default ResumeUpload;