import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import * as tf from "@tensorflow/tfjs";

export async function GET(request) {
  let xs = null;
  let ys = null;
  let predictionTensor = null;
  let predictionResult = null;
  let model = null;

  try {
    const authHeader = request.headers.get("authorization");

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        global: {
          headers: {
            Authorization: authHeader || "",
          },
        },
      }
    );

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        {
          success: false,
          error: "Not authenticated",
        },
        { status: 401 }
      );
    }

    const { data, error } = await supabase
      .from("appointments")
      .select(
        "id, appointment_date, start_time, end_time, status"
      );

    if (error) {
      console.error("Appointment Error:", error);

      return NextResponse.json(
        {
          success: false,
          error: error.message,
        },
        { status: 500 }
      );
    }

    console.log("========== PEAK HOURS ==========");
    console.log("USER:", user.id);
    console.log("APPOINTMENTS:", data);
    console.log("================================");

    if (!data || data.length === 0) {
      return NextResponse.json({
        success: true,
        totalAppointments: 0,
        trainingRecords: 0,
        predictions: [],
        peakHour: null,
        peakAppointments: 0,
        message: "No appointment data available.",
      });
    }

    const validAppointments = data.filter((appointment) => {
      const status = String(
        appointment.status || ""
      ).toLowerCase();

      return (
        status !== "cancelled" &&
        status !== "expired" &&
        appointment.start_time
      );
    });

    if (validAppointments.length === 0) {
      return NextResponse.json({
        success: true,
        totalAppointments: data.length,
        trainingRecords: 0,
        predictions: [],
        peakHour: null,
        peakAppointments: 0,
        message:
          "No valid appointment history available.",
      });
    }

    const hourCounts = {};

    for (let hour = 8; hour <= 17; hour++) {
      hourCounts[hour] = 0;
    }

    for (const appointment of validAppointments) {
      const startTime = String(
        appointment.start_time
      );

      const hour = parseInt(
        startTime.split(":")[0],
        10
      );

      if (
        Number.isInteger(hour) &&
        hour >= 8 &&
        hour <= 17
      ) {
        hourCounts[hour]++;
      }
    }

    console.log("HOUR COUNTS:", hourCounts);

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

    predictionTensor =
      tf.tensor2d(predictionInputs);

    predictionResult =
      model.predict(predictionTensor);

    const predictionValues =
      await predictionResult.data();

    console.log(
      "TENSORFLOW PREDICTIONS:",
      Array.from(predictionValues)
    );

    const predictions = [];

    for (let i = 0; i < 10; i++) {
      const hour = i + 8;

      const predictedValue = Math.max(
        0,
        Math.round(predictionValues[i])
      );

      predictions.push({
        hour: `${String(hour).padStart(
          2,
          "0"
        )}:00`,
        historicalAppointments:
          hourCounts[hour],
        predictedAppointments:
          predictedValue,
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

    console.log(
      "FINAL PREDICTIONS:",
      predictions
    );

    console.log(
      "PREDICTED PEAK HOUR:",
      peakPrediction.hour
    );

    return NextResponse.json({
      success: true,
      totalAppointments: data.length,
      trainingRecords:
        validAppointments.length,
      predictions,
      peakHour: peakPrediction.hour,
      peakAppointments:
        peakPrediction.predictedAppointments,
      model: "TensorFlow.js",
      predictionBasis:
        "TensorFlow prediction based on historical appointment patterns.",
    });
  } catch (error) {
    console.error(
      "Peak Hours Error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error.message ||
          "Failed to generate peak hour prediction.",
      },
      { status: 500 }
    );
  } finally {
    if (xs) xs.dispose();
    if (ys) ys.dispose();

    if (predictionTensor) {
      predictionTensor.dispose();
    }

    if (predictionResult) {
      predictionResult.dispose();
    }

    if (model) {
      model.dispose();
    }
  }
}