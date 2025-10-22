import React from "react";

const Calendar = ({ meetings }) => {
  return (
    <div style={{ marginTop: "30px", width: "100%" }}>
      <h2 style={{ fontSize: "1.5rem", marginBottom: "15px" }}>Calendar</h2>
      {meetings.length === 0 ? (
        <p style={{ color: "#6b7280" }}>No meetings scheduled</p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0 }}>
          {meetings.map((m) => (
            <li
              key={m._id}
              style={{
                padding: "12px",
                marginBottom: "10px",
                borderRadius: "8px",
                background: "#f3f4f6",
                fontWeight: "500",
              }}
            >
              {m.title} –{" "}
              <span style={{ color: "#2563eb" }}>
                {new Date(m.scheduledAt).toLocaleString()}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default Calendar;
