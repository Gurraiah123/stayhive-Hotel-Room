pipeline {
    agent any

    environment {

        // DockerHub

        DOCKER_USERNAME = "guru167677@gmail.com"
        DOCKER_PASSWORD = "Puneet@0114"

        BACKEND_IMAGE = "guru0114/stayhive-backend"
        FRONTEND_IMAGE = "guru0114/stayhive-frontend"

        IMAGE_TAG = "${BUILD_NUMBER}"

        // AWS

        AWS_ACCESS_KEY_ID = "AKIATCU452O6UX7YDQ6Z"
        AWS_SECRET_ACCESS_KEY = "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"

        AWS_REGION = "ap-south-2"
        EKS_CLUSTER = "stayhive-cluster"
    }

    stages {

        stage('Checkout Source') {
            steps {
                git branch: 'main',
                url: 'https://github.com/Premchand-96/stayhive-Hotel-Room.git'
            }
        }

        stage('Docker Login') {
            steps {
                sh '''
                echo "$DOCKER_PASSWORD" | docker login \
                -u "$DOCKER_USERNAME" \
                --password-stdin
                '''
            }
        }

        stage('Build Backend Image') {
            steps {
                dir('backend') {
                    sh '''
                    docker build -t ${BACKEND_IMAGE}:${IMAGE_TAG} .
                    docker tag ${BACKEND_IMAGE}:${IMAGE_TAG} ${BACKEND_IMAGE}:latest
                    '''
                }
            }
        }

        stage('Build Frontend Image') {
            steps {
                dir('frontend') {
                    sh '''
                    docker build -t ${FRONTEND_IMAGE}:${IMAGE_TAG} .
                    docker tag ${FRONTEND_IMAGE}:${IMAGE_TAG} ${FRONTEND_IMAGE}:latest
                    '''
                }
            }
        }

        stage('Push Docker Images') {
            steps {
                sh '''
                docker push ${BACKEND_IMAGE}:${IMAGE_TAG}
                docker push ${BACKEND_IMAGE}:latest

                docker push ${FRONTEND_IMAGE}:${IMAGE_TAG}
                docker push ${FRONTEND_IMAGE}:latest
                '''
            }
        }

        stage('Configure AWS CLI') {
            steps {
                sh '''
                aws configure set aws_access_key_id ${AWS_ACCESS_KEY_ID}
                aws configure set aws_secret_access_key ${AWS_SECRET_ACCESS_KEY}
                aws configure set default.region ${AWS_REGION}

                aws sts get-caller-identity
                '''
            }
        }

        stage('Configure kubectl for EKS') {
            steps {
                sh '''
                aws eks update-kubeconfig \
                --region ${AWS_REGION} \
                --name ${EKS_CLUSTER}
                '''
            }
        }

        stage('Deploy Backend') {
            steps {
                sh '''
                sed -i "s|guru0114/stayhive-backend:v1|${BACKEND_IMAGE}:${IMAGE_TAG}|g" k8s/backend-deployment.yaml

                kubectl apply -f k8s/backend-deployment.yaml
                kubectl apply -f k8s/backend-service.yaml
                '''
            }
        }

        stage('Deploy Frontend') {
            steps {
                sh '''
                sed -i "s|guru0114/stayhive-frontend:v1|${FRONTEND_IMAGE}:${IMAGE_TAG}|g" k8s/frontend-deployment.yaml

                kubectl apply -f k8s/frontend-deployment.yaml
                kubectl apply -f k8s/frontend-service.yaml
                '''
            }
        }

        stage('Verify Deployment') {
            steps {
                sh '''
                echo "========================="
                echo "Nodes"
                echo "========================="
                kubectl get nodes

                echo "========================="
                echo "Pods"
                echo "========================="
                kubectl get pods -o wide

                echo "========================="
                echo "Deployments"
                echo "========================="
                kubectl get deployments

                echo "========================="
                echo "Services"
                echo "========================="
                kubectl get svc
                '''
            }
        }

    }

    post {

        success {
            echo "======================================"
            echo "Deployment Successful"
            echo "======================================"
        }

        failure {
            echo "======================================"
            echo "Deployment Failed"
            echo "======================================"
        }

        always {
            sh '''
            docker logout
            docker image prune -af || true
            '''
        }
    }
}
