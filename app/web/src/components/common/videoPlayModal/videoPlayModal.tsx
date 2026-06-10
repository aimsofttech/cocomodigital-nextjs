// @ts-nocheck
import Modal from "@/src/components/common/TailwindModal/TailwindModal";
import ReactPlayer from "react-player";

const VideoPlayModal = ({ showModal, setShowModal, activeVideoUrl }) => {
  return (
    <Modal
      show={showModal}
      onHide={() => setShowModal(false)}
      centered
      backdrop="static"
      size="lg"
      className="custom-modal"
    >
      <Modal.Header closeButton>
        {/* <Modal.Title>
          <strong>{videoToPlay?.title}</strong>
        </Modal.Title> */}
      </Modal.Header>

      <Modal.Body className="p-0">
        <div
          className="video-container"
          style={{ position: "relative", paddingTop: "56.25%" }}
        >
          <ReactPlayer
            url={activeVideoUrl}
            controls
            playing={true}
            width="100%"
            height="100%"
            style={{ position: "absolute", top: 0, left: 0 }}
          />
        </div>
      </Modal.Body>
    </Modal>
  );
};

export default VideoPlayModal;
