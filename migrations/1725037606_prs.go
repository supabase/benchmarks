package migrations

import (
	"github.com/pocketbase/dbx"
	"github.com/pocketbase/pocketbase/daos"
	m "github.com/pocketbase/pocketbase/migrations"
	pbm "github.com/pocketbase/pocketbase/models"
	"github.com/pocketbase/pocketbase/models/schema"
)

func init() {
	m.Register(func(db dbx.Builder) error {
		dao := daos.New(db)
		registeredRule := "@request.user.id != \"\""
		privilegedRule := registeredRule + " && @request.user.profile.role = \"privileged\""

		// Create GitHub PRs table
		githubPRs := &pbm.Collection{
			BaseModel:  pbm.BaseModel{},
			Name:       "github_prs",
			System:     false,
			ListRule:   &privilegedRule,
			ViewRule:   &privilegedRule,
			CreateRule: &privilegedRule,
			UpdateRule: &privilegedRule,
			DeleteRule: &privilegedRule,
			Schema: schema.NewSchema(
				&schema.SchemaField{
					Name:     "pr_link",
					Type:     schema.FieldTypeUrl,
					Required: true,
					Options:  &schema.UrlOptions{},
				},
				&schema.SchemaField{
					Name:    "gh_comment",
					Type:    schema.FieldTypeText,
					Options: &schema.TextOptions{},
				},
				&schema.SchemaField{
					Name:     "gh_comment_link",
					Type:     schema.FieldTypeUrl,
					Required: false,
					Options:  &schema.UrlOptions{},
				},
			),
		}

		// Add reference to GitHub PR in runs table
		runs, err := dao.FindCollectionByNameOrId("runs")
		if err != nil {
			return err
		}
		runs.Schema.AddField(&schema.SchemaField{
			Name:     "github_pr_id",
			Type:     schema.FieldTypeRelation,
			Required: false,
			Options: &schema.RelationOptions{
				MaxSelect:     1,
				CollectionId:  "github_prs",
				CascadeDelete: false,
			},
		})

		if err := dao.SaveCollection(githubPRs); err != nil {
			return err
		}
		return dao.SaveCollection(runs)
	}, func(db dbx.Builder) error {
		dao := daos.New(db)

		// Drop reference to GitHub PR in runs table
		runs, err := dao.FindCollectionByNameOrId("runs")
		if err != nil {
			return err
		}
		f := runs.Schema.GetFieldByName("github_pr_id")
		runs.Schema.RemoveField(f.Id)

		// Drop GitHub PRs table
		if _, err := db.DropTable("github_prs").Execute(); err != nil {
			return err
		}

		return dao.SaveCollection(runs)
	}, "migrations/1725037606_prs.go")
}
