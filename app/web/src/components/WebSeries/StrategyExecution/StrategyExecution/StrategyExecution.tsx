// @ts-nocheck
import StrategyExecutionSection from "../StrategyExecutionSection/StrategyExecutionSection";
const StrategyExecution = ({ itemData }) => {
    const data = (itemData?.ideas_strategy_planning ?? []).map(obj => ({
        ...obj,
        type: "ideas"
    }));

    return (
        <div
            className="pre-launched-activity-main-wrapper"
            style={{ background: "#F7F7F7" }}
        >
            <div className="pre-launched-activity-main">
                <h2 className="single-web-series-main-title font-primary text-center">
                    Our Activities
                </h2>
                {data?.length > 0 ? (
                    data?.map((item, index) => (
                        <StrategyExecutionSection key={index} data={item} index={index} />
                    ))
                ) : (
                    <div className="w-full flex justify-center content-center">
                        <p>Data not available</p>
                    </div>
                )}
            </div>
        </div>
    )
}

export default StrategyExecution