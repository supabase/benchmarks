package run

import (
	"github.com/labstack/echo/v5"
	"github.com/supabase/supabench/internal/execution"
	"github.com/supabase/supabench/models"
)

func NewHandler(app *execution.App) echo.HandlerFunc {
	return func(c echo.Context) error {
		run := models.Run{}
		if err := c.Echo().JSONSerializer.Deserialize(c, &run); err != nil {
			return c.JSON(400, map[string]string{"error": err.Error()})
		}

		if run.BenchmarkID == "" || run.Name == "" {
			return c.JSON(400, map[string]string{"error": "missing required fields: benchmark_id, name"})
		}

		run.RefreshId()
		run.RefreshCreated()
		run.RefreshUpdated()
		run.TriggeredAt = run.Created
		run.Status = "pending"

		if err := app.PB.DB().Model(&run).
			Insert(
				"Id", "BenchmarkID", "Name", "Origin", "Status",
				"Created", "Updated", "TriggeredAt",
			); err != nil {
			return c.JSON(500, map[string]string{"error": err.Error()})
		}

		return c.JSON(201, run)
	}
}
