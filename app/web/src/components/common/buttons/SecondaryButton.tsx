// @ts-nocheck
import { GoArrowDown, GoArrowUp } from "react-icons/go";
const SecondaryButton = ({ label, onClick }) => {
    return (
        <button onClick={onClick} className="secondary-button" type="button" aria-label="Add">
            <span className="btn-text">{label}</span>
            <span>
                {label === "Show more" ? (
                    <GoArrowDown size={20} style={{ strokeWidth: 1 }} />
                ) : (
                    <GoArrowUp size={20} style={{ strokeWidth: 1 }} />
                )}
            </span>
        </button>
    )
}

export default SecondaryButton