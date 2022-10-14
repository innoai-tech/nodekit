import { pipeable, array } from "fp-ts";

pipeable.pipe(
  [1, 2, 4],
  array.map((v) => v * v),
  console.log
);
