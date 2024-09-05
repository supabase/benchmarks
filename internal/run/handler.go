package run

import (
	"regexp"
	"strings"

	"github.com/labstack/echo/v5"
	"github.com/pocketbase/dbx"
	"github.com/rs/zerolog/log"
	"github.com/supabase/supabench/internal/execution"
	"github.com/supabase/supabench/internal/gh"
	"github.com/supabase/supabench/models"
)

// nameRegex is a regex for validating run names.
var nameRegex = regexp.MustCompile("^[a-zA-Z0-9.:_-]*$")

func NewHandler(app *execution.App) echo.HandlerFunc {
	return func(c echo.Context) error {
		newrun := models.NewRun{}
		if err := c.Echo().JSONSerializer.Deserialize(c, &newrun); err != nil {
			return c.JSON(400, map[string]string{"error": err.Error()})
		}

		if newrun.BenchmarkID == "" || newrun.Name == "" {
			return c.JSON(400, map[string]string{"error": "missing required fields: benchmark_id, name"})
		}
		run := newrun.Run

		run.RefreshId()
		run.RefreshCreated()
		run.RefreshUpdated()
		run.TriggeredAt = run.Created
		run.Status = "pending"
		run.Name = strings.ReplaceAll(strings.TrimSpace(run.Name), " ", "_")
		if run.Origin != nil {
			o := strings.TrimSpace(*run.Origin)
			o = strings.ReplaceAll(o, " ", "_")
			run.Origin = &o
		}

		// Validate run name.
		if !nameRegex.MatchString(run.Name) {
			return c.JSON(400, map[string]string{
				"error": "invalid name, should be alphanumeric, dot, dash, underscore",
			})
		}

		if err := app.PB.DB().Model(&run).
			Insert(
				"Id", "BenchmarkID", "Name", "Origin", "Status", "Comment",
				"Created", "Updated", "TriggeredAt", "Meta", "Vars",
			); err != nil {
			return c.JSON(500, map[string]string{"error": err.Error()})
		}

		var grafanaURL string
		if err := app.PB.DB().
			Select("grafana_url").
			From("benchmarks").
			Where(dbx.HashExp{"id": run.BenchmarkID}).
			Row(&grafanaURL); err != nil {
			log.Error().Err(err).Msg("error getting benchmark")
		}

		if newrun.GitHubPRLink != "" {
			if prID, err := app.GH.AddOrUpdateComment(c.Request().Context(), newrun.GitHubPRLink, gh.InProgressCommentString(grafanaURL)); err != nil {
				return c.JSON(500, map[string]string{"error": err.Error()})
			} else {
				run.RefreshUpdated()
				run.GitHubPRID = &prID
				if err := app.PB.DB().Model(&run).
					Update(
						"GitHubPRID", "Updated",
					); err != nil {
					return c.JSON(500, map[string]string{"error": err.Error()})
				}
			}
		}

		return c.JSON(201, run)
	}
}
