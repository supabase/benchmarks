package migrations

import (
	"fmt"

	"github.com/pocketbase/dbx"
	"github.com/pocketbase/pocketbase/daos"
	m "github.com/pocketbase/pocketbase/migrations"
	pbm "github.com/pocketbase/pocketbase/models"
	"github.com/pocketbase/pocketbase/models/schema"
)

func init() {
	m.Register(func(db dbx.Builder) error {
		ownerRule := fmt.Sprintf("%s = @request.user.id", "owner_id")
		registeredRule := "@request.user.id != \"\""
		privilegedRule := registeredRule + " && @request.user.profile.role = \"privileged\""
		anyoneRule := ""
		projects := &pbm.Collection{
			BaseModel:  pbm.BaseModel{},
			Name:       "projects",
			System:     false,
			ListRule:   &anyoneRule,
			ViewRule:   &anyoneRule,
			CreateRule: &privilegedRule,
			UpdateRule: &ownerRule,
			DeleteRule: &ownerRule,
			Schema: schema.NewSchema(
				&schema.SchemaField{
					Name:     "owner_id",
					Type:     schema.FieldTypeUser,
					Required: true,
					Options: &schema.UserOptions{
						MaxSelect:     1,
						CascadeDelete: true,
					},
				},
				&schema.SchemaField{
					Name:     "name",
					Type:     schema.FieldTypeText,
					Required: true,
					Options:  &schema.TextOptions{},
				},
				&schema.SchemaField{
					Name:     "slug",
					Type:     schema.FieldTypeText,
					Required: true,
					Unique:   true,
					Options:  &schema.TextOptions{},
				},
				&schema.SchemaField{
					Name:    "repo",
					Type:    schema.FieldTypeUrl,
					Options: &schema.UrlOptions{},
				},
				&schema.SchemaField{
					Name:    "meta",
					Type:    schema.FieldTypeJson,
					Options: &schema.JsonOptions{},
				},
			),
		}

		benchmarks := &pbm.Collection{
			BaseModel:  pbm.BaseModel{},
			Name:       "benchmarks",
			System:     false,
			ListRule:   &anyoneRule,
			ViewRule:   &anyoneRule,
			CreateRule: &privilegedRule,
			UpdateRule: &ownerRule,
			DeleteRule: &ownerRule,
			Schema: schema.NewSchema(
				&schema.SchemaField{
					Name:     "owner_id",
					Type:     schema.FieldTypeUser,
					Required: true,
					Options: &schema.UserOptions{
						MaxSelect:     1,
						CascadeDelete: true,
					},
				},
				&schema.SchemaField{
					Name:     "project_id",
					Type:     schema.FieldTypeRelation,
					Required: true,
					Options: &schema.RelationOptions{
						MaxSelect:     1,
						CollectionId:  "projects",
						CascadeDelete: true,
					},
				},
				&schema.SchemaField{
					Name:     "name",
					Type:     schema.FieldTypeText,
					Required: true,
					Options:  &schema.TextOptions{},
				},
				&schema.SchemaField{
					Name:     "slug",
					Type:     schema.FieldTypeText,
					Required: true,
					Unique:   true,
					Options:  &schema.TextOptions{},
				},
				&schema.SchemaField{
					Name:    "grafana_url",
					Type:    schema.FieldTypeUrl,
					Options: &schema.UrlOptions{},
				},
				&schema.SchemaField{
					Name:    "default_origin",
					Type:    schema.FieldTypeText,
					Options: &schema.TextOptions{},
				},
				&schema.SchemaField{
					Name:    "extract_metric_path",
					Type:    schema.FieldTypeText,
					Options: &schema.TextOptions{},
				},
				&schema.SchemaField{
					Name:    "meta",
					Type:    schema.FieldTypeJson,
					Options: &schema.JsonOptions{},
				},
			),
		}

		secrets := &pbm.Collection{
			BaseModel:  pbm.BaseModel{},
			Name:       "secrets",
			System:     false,
			ListRule:   &privilegedRule,
			ViewRule:   &privilegedRule,
			CreateRule: &privilegedRule,
			UpdateRule: &ownerRule,
			DeleteRule: &ownerRule,
			Schema: schema.NewSchema(
				&schema.SchemaField{
					Name:     "owner_id",
					Type:     schema.FieldTypeUser,
					Required: true,
					Options: &schema.UserOptions{
						MaxSelect:     1,
						CascadeDelete: true,
					},
				},
				&schema.SchemaField{
					Name:     "benchmark_id",
					Type:     schema.FieldTypeRelation,
					Required: true,
					Unique:   true,
					Options: &schema.RelationOptions{
						MaxSelect:     1,
						CollectionId:  "benchmarks",
						CascadeDelete: true,
					},
				},
				&schema.SchemaField{
					Name: "script",
					Type: schema.FieldTypeFile,
					Options: &schema.FileOptions{
						MaxSelect: 1,
						MaxSize:   5242880,
						MimeTypes: []string{
							"application/zip",
							"application/vnd.rar",
							"application/x-tar",
						},
					},
				},
				&schema.SchemaField{
					Name:    "script_link",
					Type:    schema.FieldTypeJson,
					Options: &schema.JsonOptions{},
				},
				&schema.SchemaField{
					Name:    "env",
					Type:    schema.FieldTypeJson,
					Options: &schema.JsonOptions{},
				},
				&schema.SchemaField{
					Name:    "vars",
					Type:    schema.FieldTypeJson,
					Options: &schema.JsonOptions{},
				},
			),
		}

		runs := &pbm.Collection{
			BaseModel:  pbm.BaseModel{},
			Name:       "runs",
			System:     false,
			ListRule:   &anyoneRule,
			ViewRule:   &anyoneRule,
			CreateRule: nil,
			UpdateRule: nil,
			DeleteRule: nil,
			Schema: schema.NewSchema(
				&schema.SchemaField{
					Name:     "benchmark_id",
					Type:     schema.FieldTypeRelation,
					Required: true,
					Options: &schema.RelationOptions{
						MaxSelect:     1,
						CollectionId:  "benchmarks",
						CascadeDelete: true,
					},
				},
				&schema.SchemaField{
					Name:     "name",
					Type:     schema.FieldTypeText,
					Required: true,
					Options:  &schema.TextOptions{},
				},
				&schema.SchemaField{
					Name:    "origin",
					Type:    schema.FieldTypeText,
					Options: &schema.TextOptions{},
				},
				&schema.SchemaField{
					Name:     "status",
					Type:     schema.FieldTypeSelect,
					Required: true,
					Options: &schema.SelectOptions{
						MaxSelect: 1,
						Values: []string{
							"pending",
							"running",
							"success",
							"fail",
							"finished",
						},
					},
				},
				&schema.SchemaField{
					Name:    "started_at",
					Type:    schema.FieldTypeText,
					Options: &schema.TextOptions{},
				},
				&schema.SchemaField{
					Name:    "ended_at",
					Type:    schema.FieldTypeText,
					Options: &schema.TextOptions{},
				},
				&schema.SchemaField{
					Name:    "output",
					Type:    schema.FieldTypeText,
					Options: &schema.TextOptions{},
				},
				&schema.SchemaField{
					Name:    "errors",
					Type:    schema.FieldTypeJson,
					Options: &schema.JsonOptions{},
				},
				&schema.SchemaField{
					Name:    "triggered_at",
					Type:    schema.FieldTypeDate,
					Options: &schema.DateOptions{},
				},
				&schema.SchemaField{
					Name:    "raw",
					Type:    schema.FieldTypeJson,
					Options: &schema.JsonOptions{},
				},
				&schema.SchemaField{
					Name:    "meta",
					Type:    schema.FieldTypeJson,
					Options: &schema.JsonOptions{},
				},
			),
		}

		dao := daos.New(db)

		profiles, err := dao.FindCollectionByNameOrId("profiles")
		if err != nil {
			return err
		}
		profiles.Schema.AddField(&schema.SchemaField{
			Name: "role",
			Type: schema.FieldTypeSelect,
			Options: &schema.SelectOptions{
				MaxSelect: 1,
				Values:    []string{"privileged", "viewer"},
			},
		})

		if err := dao.SaveCollection(profiles); err != nil {
			return err
		}

		if err := dao.SaveCollection(projects); err != nil {
			return err
		}
		if err := dao.SaveCollection(benchmarks); err != nil {
			return err
		}
		if err := dao.SaveCollection(secrets); err != nil {
			return err
		}
		return dao.SaveCollection(runs)
	}, func(db dbx.Builder) error {
		if _, err := db.DropTable("runs").Execute(); err != nil {
			return err
		}
		if _, err := db.DropTable("secrets").Execute(); err != nil {
			return err
		}
		if _, err := db.DropTable("benchmarks").Execute(); err != nil {
			return err
		}
		if _, err := db.DropTable("projects").Execute(); err != nil {
			return err
		}

		dao := daos.New(db)

		profiles, err := dao.FindCollectionByNameOrId("profiles")
		if err != nil {
			return err
		}
		f := profiles.Schema.GetFieldByName("role")
		profiles.Schema.RemoveField(f.Id)
		if err := dao.SaveCollection(profiles); err != nil {
			return err
		}

		return nil
	}, "migrations/1659604348_init.go")
}
