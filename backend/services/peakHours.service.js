/**
 * Trains a small TensorFlow.js model on the hourly appointment history and
 * returns the predicted peak clinic hour. This is a direct port of the
 * original SmartClinic "Peak Hours" implementation.
 *
 * @param {Array} appointments - list of { id, appointment_date, start_time, end_time, status }
 * @returns {object} prediction payload for the frontend dashboard
 */
export async function predictPeakHours(appointments) {
  const data = appointments || [];

  if (!data || data.length === 0) {
    return {
      success: true,
      totalAppointments: 0,
      trainingRecords: 0,
      predictions: [],
      peakHour: null,
      peakAppointments: 0,
      message: "No appointment data available.",
    };
  }

  const validAppointments = data.filter((appointment) => {
    const status = String(appointment.status || "").toLowerCase();

    return (
      status !== "cancelled" &&
      status !== "expired" &&
      appointment.start_time
    );
  });

  if (validAppointments.length === 0) {
    return {
      success: true,
      totalAppointments: data.length,
      trainingRecords: 0,
      predictions: [],
      peakHour: null,
      peakAppointments: 0,
      message: "No valid appointment history available.",
    };
  }

  let xs = null;
  let ys = null;
  let predictionTensor = null;
  let predictionResult = null;
  let model = null;

  try {
    // Lazy-load TensorFlow.js only when a prediction is actually requested.
    // Eagerly importing TFJS at module load makes every server boot extremely
    // heavy and can crash other local services on the same machine.
    const tf = await import("@tensorflow/tfjs");
    const hourCounts = {};

    for (let hour = 8; hour <= 17; hour++) {
      hourCounts[hour] = 0;
    }

    for (const appointment of validAppointments) {
      const startTime = String(appointment.start_time);
      const hour = parseInt(startTime.split(":")[0], 10);

      if (Number.isInteger(hour) && hour >= 8 && hour <= 17) {
        hourCounts[hour]++;
      }
    }

    const trainingInputs = [];
    const trainingOutputs = [];

    for (let hour = 8; hour <= 17; hour++) {
      trainingInputs.push([hour]);
      trainingOutputs.push([hourCounts[hour]]);
    }

    xs = tf.tensor2d(trainingInputs);
    ys = tf.tensor2d(trainingOutputs);

    model = tf.sequential();

    model.add(
      tf.layers.dense({
        units: 16,
        activation: "relu",
        inputShape: [1],
      })
    );

    model.add(
      tf.layers.dense({
        units: 8,
        activation: "relu",
      })
    );

    model.add(
      tf.layers.dense({
        units: 1,
        activation: "linear",
      })
    );

    model.compile({
      optimizer: tf.train.adam(0.01),
      loss: "meanSquaredError",
    });

    await model.fit(xs, ys, {
      epochs: 150,
      shuffle: true,
      verbose: 0,
    });

    const predictionInputs = [];

    for (let hour = 8; hour <= 17; hour++) {
      predictionInputs.push([hour]);
    }

    predictionTensor = tf.tensor2d(predictionInputs);
    predictionResult = model.predict(predictionTensor);

    const predictionValues = await predictionResult.data();

    const predictions = [];

    for (let i = 0; i < 10; i++) {
      const hour = i + 8;
      const predictedValue = Math.max(0, Math.round(predictionValues[i]));

      predictions.push({
        hour: `${String(hour).padStart(2, "0")}:00`,
        historicalAppointments: hourCounts[hour],
        predictedAppointments: predictedValue,
      });
    }

    let peakPrediction = predictions[0];

    for (const prediction of predictions) {
      if (
        prediction.predictedAppointments >
        peakPrediction.predictedAppointments
      ) {
        peakPrediction = prediction;
      }
    }

    return {
      success: true,
      totalAppointments: data.length,
      trainingRecords: validAppointments.length,
      predictions,
      peakHour: peakPrediction.hour,
      peakAppointments: peakPrediction.predictedAppointments,
      model: "TensorFlow.js",
      predictionBasis:
        "TensorFlow prediction based on historical appointment patterns.",
    };
  } finally {
    if (xs) xs.dispose();
    if (ys) ys.dispose();
    if (predictionTensor) predictionTensor.dispose();
    if (predictionResult) predictionResult.dispose();
    if (model) model.dispose();
  }
}