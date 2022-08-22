package pipelines

import (
	"github.com/labstack/echo/v5"
	"github.com/labstack/echo/v5/middleware"
	"github.com/pocketbase/pocketbase/apis"
	"github.com/pocketbase/pocketbase/core"
	"github.com/supabase/supabench/internal/execution"
	"github.com/supabase/supabench/web"
)

func InitUI(app *execution.App) {
	app.PB.OnBeforeServe().Add(func(e *core.ServeEvent) error {
		return BindStaticDashboardUI(e.Router)
	})
}

// BindStaticDashboardUI registers the endpoints that serves the static admin UI.
func BindStaticDashboardUI(e *echo.Echo) error {
	// serves /ui/dist/index.html file
	// (explicit route is used to avoid conflicts with `RemoveTrailingSlash` middleware)
	e.FileFS(
		"/",
		"index.html",
		web.DistIndexHTML,
		middleware.Gzip(),
	)

	// serves static files from the /ui/dist directory
	// (similar to echo.StaticFS but with gzip middleware enabled)
	e.GET(
		"/*",
		apis.StaticDirectoryHandler(web.DistDirFS, false),
		middleware.Gzip(),
	)

	return nil
}
